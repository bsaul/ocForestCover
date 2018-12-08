#------------------------------------------------------------------------------#
#  TITLE: Sample points for OC forest canopy estimation
#   DATE: 20181116
#   PROG: B Saul
#   DESC: Generate sample points to use for estimation of forest cover in 
#         in Orange County within:
#            - county-owned property
#            - rural buffer
#------------------------------------------------------------------------------#

library(spatial)
library(rgdal)
library(dplyr)
library(sp)

# TODO: 
# * download .shp files directly from county website rather than use files saved to HD

## Load spatial data ####
projproj <- function(x) spTransform(x, CRS("+init=epsg:4326"))

read_sp_data <- function(.dsn, .layer){
  projproj(readOGR(dsn = .dsn, layer = .layer, stringsAsFactors = FALSE))
}

county_boundary <- read_sp_data("extdata/county", "CountyLine")

spl_files <- list(rb = c("Zoning", "extdata/Zoning_and_Overlays"),
                  cl = c("OC_owned_land", "extdata/OC_owned_land"))

spl_data <- purrr::map(spl_files, ~ read_sp_data(.x[2], .x[1]))

spl_data[["rb"]] <- spl_data[["rb"]][spl_data[["rb"]]$Zoning_Def == "Rural Buffer", ]

## Sampling functions ####
sample_area_points <- function(.data, .n, .area, .seed){
  set.seed(.seed)
  as.data.frame(spsample(.data, .n, type = "random")) %>%
    transmute(
      lon  = x,
      lat  = y,
      area = .area
    )
}

sample_study_points <- function(.area_list, .n, .seed){
  purrr::map2_dfr(.area_list, names(.area_list), ~ sample_area_points(.x, .n, .y, .seed)) %>%
    mutate(
    `_id`   = sprintf("p%s", formatC(1:(.n*length(.area_list)), width = 6, flag = "0"))
    ) %>%
    select(`_id`, everything())
}


#------------------------------------------------------------------------------#
## Simple random sample for pilot study ####
#------------------------------------------------------------------------------#

n <- 50
pilot_points <- sample_study_points(spl_data, n, 321)
pilot_points <- split(pilot_points, pilot_points$`_id`) %>%
  purrr::map(function(x){
    x <- as.list(x)
    x$latlon <- c(x$lat, x$lon)
    x$identifications <- list()
    x$lat <- NULL
    x$lon <- NULL
    x
  })

pilot_study_settings <- list(
  `_id`   = "study_settings",
  name    = "Pilot Study of OC Tree cover",
  purpose = "testing of application",
  overlap_probability = 1,
  times   = list(
    list(
      `_id`      = "y2008",
      year       = 2008,
      active     = TRUE,
      wms_server = "https://services.nconemap.gov/secure/services/Imagery/Orthoimagery_2008/ImageServer/WMSServer",
      version    = "1.3.0",
      layer      = "0"
    ),
    list(
      `_id`      = "y2010",
      year       = 2010,
      active     = TRUE,
      wms_server = "https://services.nconemap.gov/secure/services/Imagery/Orthoimagery_2010/ImageServer/WMSServer",
      version    = "1.3.0",
      layer      =   "0"
    ),
    list(
      `_id`      = "y2017",
      year       = 2017,
      active     = TRUE,
      wms_server = "https://services.nconemap.gov/secure/services/Imagery/Orthoimagery_2017/ImageServer/WMSServer",
      version    = "1.3.0",
      layer      = "0"
    )
  )
)

pilot_study <- append(list(pilot_study_settings), unname(pilot_points))
json_pilot <- jsonlite::toJSON(pilot_study, auto_unbox = TRUE)
json_pilot <- stringr::str_replace_all(json_pilot, "\\[\\]", "{}")
writeLines(paste0('{"docs" : ', json_pilot, "}"), con = "study_data/pilot_study.json")

# Shell commands to create the db and add points
# HOST="http://USER:PASS@68.183.114.219:5984"
# 
# curl -X PUT "$HOST/oc_pilot_study"
# curl -vX POST "$HOST/oc_pilot_study/_bulk_docs" \
# -H "Content-type: application/json" \
# -d @study_data/pilot_study.json

#------------------------------------------------------------------------------#
## Simple random sample for main study ####
#------------------------------------------------------------------------------#


## Plotting ####
# plot(oc_boundary)
# plot(oc_rb, add = TRUE)
# plot(oc_parks, add = TRUE)
# points(z, pch = 3, cex = .1)



