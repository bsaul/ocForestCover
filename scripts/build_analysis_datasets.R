#------------------------------------------------------------------------------#
#  TITLE: Build analysis datasets from CouchDB backup
#   DATE: 2026-05-29
#   PROG: B Saul
#   DESC: Reads a local backup produced by scripts/backup_db.sh
#         (one JSON per database) and writes CSVs under data/:
#           - study_points_<date>.csv         point-level metadata
#           - study_identifications_<date>.csv long-format identifications (uid only)
#           - analysis_dt_<date>.csv          point/time-level summary
#           - users_<date>.csv                email <-> uid mapping (gitignored)
#
# usage:  Rscript --vanilla scripts/build_analysis_datasets.R [backup_dir]
#         default backup_dir: data/backup_<YYYYMMDD-from-today>
#------------------------------------------------------------------------------#

suppressPackageStartupMessages({
  library(jsonlite)
  library(dplyr)
  library(purrr)
  library(tibble)
})

args       <- commandArgs(trailingOnly = TRUE)
backup_dir <- if (length(args) >= 1) args[[1]] else "data/backup_20260529"
if (!dir.exists(backup_dir)) stop("backup_dir not found: ", backup_dir)

# Date stamp for output files: take it from the trailing digits of the
# backup directory name (scripts/backup_db.sh names them backup_YYYYMMDD).
datadate <- sub(".*_(\\d{8})$", "\\1", basename(backup_dir))
if (!grepl("^\\d{8}$", datadate)) {
  datadate <- format(Sys.Date(), "%Y%m%d")
}

study_id_filter <- "oc_primary_study"
points_file     <- file.path(backup_dir, "oc_primary_study_2025.json")
users_file      <- file.path(backup_dir, "_users.json")
out_dir         <- "data"

read_rows <- function(path) {
  fromJSON(path, simplifyVector = FALSE)$rows
}

`%||%` <- function(x, y) if (is.null(x)) y else x

# --- Users ----------------------------------------------------------------- #
emails <- read_rows(users_file) |>
  map(~ .x$doc$name) |>
  compact() |>
  keep(~ grepl("@", .x)) |>
  unlist() |>
  sort()

userdbs <- map_chr(
  emails,
  ~ paste0("userdb-", paste0(charToRaw(.x), collapse = ""))
)

users <- tibble(
  user = emails,
  db   = userdbs,
  uid  = LETTERS[seq_along(emails)]
)

# --- Points ---------------------------------------------------------------- #
point_rows <- read_rows(points_file)

points <- map_dfr(point_rows, function(row) {
  d <- row$doc
  ids <- d$identifications %||% list()
  tibble(
    point     = d$`_id`,
    area      = d$area %||% NA_character_,
    lat       = if (length(d$latlon) >= 1) d$latlon[[1]] else NA_real_,
    lon       = if (length(d$latlon) >= 2) d$latlon[[2]] else NA_real_,
    y2008     = as.integer(ids$y2008 %||% 0L),
    y2017     = as.integer(ids$y2017 %||% 0L),
    y2021     = as.integer(ids$y2021 %||% 0L),
    total_ids = as.integer(d$total_ids %||% 0L)
  )
})

# --- Identifications ------------------------------------------------------- #
read_user_ids <- function(user_row) {
  path <- file.path(backup_dir, paste0(user_row$db, ".json"))
  if (!file.exists(path)) return(tibble())
  rows <- read_rows(path)
  if (length(rows) == 0) return(tibble())
  map_dfr(rows, function(row) {
    d <- row$doc
    tibble(
      `_id`     = d$`_id`,
      value     = d$value %||% NA_character_,
      study_id  = d$study_id %||% NA_character_,
      timestamp = d$timestamp %||% NA_character_
    )
  }) |>
    mutate(user = user_row$user, uid = user_row$uid)
}

ids_raw <- users |>
  split(seq_len(nrow(users))) |>
  map_dfr(read_user_ids)

parse_iso8601 <- function(x) {
  as.POSIXct(x, format = "%Y-%m-%dT%H:%M:%OS", tz = "UTC")
}

identifications <- ids_raw |>
  filter(study_id == study_id_filter) |>
  mutate(
    .parts    = strsplit(`_id`, "_", fixed = TRUE),
    id        = vapply(.parts, `[`, character(1), 1),
    point     = vapply(.parts, `[`, character(1), 2),
    time      = vapply(.parts, `[`, character(1), 3),
    timestamp = parse_iso8601(timestamp)
  ) |>
  select(id, point, time, value, study_id, timestamp, uid)

# --- Point/time-level analysis dataset ------------------------------------- #
analysis_dt <- identifications |>
  left_join(select(points, point, area), by = "point") |>
  group_by(point, area, time) |>
  summarise(
    nids = n(),
    nT   = sum(value == "T"),
    nN   = sum(value == "N"),
    nU   = sum(value == "U"),
    .groups = "drop"
  ) |>
  mutate(
    agreement = (nids == nT) | (nids == nN) | (nids == nU),
    value = case_when(
      agreement & (nT > 0) ~ "T",
      agreement & (nN > 0) ~ "N",
      agreement & (nU > 0) ~ "Ua",
      TRUE                 ~ "Ub"
    )
  )

# --- Write ----------------------------------------------------------------- #
if (!dir.exists(out_dir)) dir.create(out_dir, recursive = TRUE)

points_out   <- file.path(out_dir, sprintf("study_points_%s.csv",          datadate))
ids_out      <- file.path(out_dir, sprintf("study_identifications_%s.csv",  datadate))
analysis_out <- file.path(out_dir, sprintf("analysis_dt_%s.csv",            datadate))
users_out    <- file.path(out_dir, sprintf("users_%s.csv",                  datadate))

write.csv(points,          points_out,   row.names = FALSE)
write.csv(identifications, ids_out,      row.names = FALSE)
write.csv(analysis_dt,     analysis_out, row.names = FALSE)
# users table maps emails to uid; gitignored via data/users_*.csv in .gitignore
write.csv(users,           users_out,    row.names = FALSE)

message(sprintf(
  "Wrote:\n  %s (%d rows)\n  %s (%d rows)\n  %s (%d rows)\n  %s (%d rows)",
  points_out,    nrow(points),
  ids_out,       nrow(identifications),
  analysis_out,  nrow(analysis_dt),
  users_out,     nrow(users)
))
