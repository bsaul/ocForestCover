#------------------------------------------------------------------------------#
#  TITLE: Analysis script for primary study
#   DATE: 20194014
#   PROG: B Saul
#   DESC: 
#------------------------------------------------------------------------------#

library(stringr)
library(dplyr)

# Load source data ####

datadate <- "20190421"
ids      <- readRDS(sprintf("data/study_identifications_%s.rds", datadate))
points   <- readRDS(sprintf("data/study_points_%s.rds", datadate))

# Create analytic dataset ####
analysis_dt <- ids %>%
  select(-X_rev) %>%
  filter(study_id == "oc_primary_study") %>%
  tidyr::separate(
    X_id, into = c("id", "point", "time"), sep = "_"
  ) %>%
  select(-db) %>%
  mutate(
    timestamp = lubridate::ymd_hms(timestamp)
  ) %>% 
  left_join(
    select(points, point = `_id`, area),
    by = c("point")
  ) %>%
  group_by(point, area, time) %>%
  summarise(
    nids = n(),
    nT   = sum(value == "T"),
    nN   = sum(value == "N"),
    nU   = sum(value == "U")
  ) %>%
  mutate(
    agreement = (nids == nT) | (nids == nN) | (nids == nU),
    value     = case_when(
      agreement & (nT > 0) ~ "T",
      agreement & (nN > 0) ~ "N",
      agreement & (nU > 0) ~ "Ua",
      TRUE ~ "Ub"
    )
  ) 

## Crude analysis ####
# - ignore pairing

analysis_dt %>% 
  filter(agreement & value != "Ua") %>%
  select(area, point, time, value) %>%
  group_by(area, time) %>%
  summarise(
    tree_cover = mean(value == "T")
  ) %>%
  tidyr::spread(
    key = "time", value = "tree_cover"
  ) %>%
  mutate(
    change = y2017 - y2008
  )

