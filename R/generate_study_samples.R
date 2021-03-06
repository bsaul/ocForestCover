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
library(rgeos)

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
spl_data[["oc"]] <- Reduce(f = rgeos::gDifference, append(county_boundary, spl_data))

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
  
  purrr::pmap_dfr(
    .l = append(list(.area_list, names(.area_list)), list(as.list(.n))),
    .f = function(d, nm, n){
      sample_area_points(.data = d, .n = n, .area = nm, .seed = .seed)
    }) %>%
    mutate(
    `_id`   = sprintf("p%s", formatC(1:n(), width = 6, flag = "0"))
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
  study_id = "oc_pilot_study",
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
    # list(
    #   `_id`      = "y2010",
    #   year       = 2010,
    #   active     = TRUE,
    #   wms_server = "https://services.nconemap.gov/secure/services/Imagery/Orthoimagery_2010/ImageServer/WMSServer",
    #   version    = "1.3.0",
    #   layer      =   "0"
    # ),
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
n <- c(rb = 2500, co = 2500, oc = 1500)
primary_points_a <- sample_study_points(spl_data, n, 321)
primary_points <- split(primary_points_a, primary_points_a$`_id`) %>%
  purrr::map(function(x){
    x <- as.list(x)
    x$latlon <- c(x$lat, x$lon)
    x$identifications <- list()
    x$lat <- NULL
    x$lon <- NULL
    x
  })

primary_study_settings <- list(
  `_id`    = "study_settings",
  name     = "Primary Study of OC Tree cover",
  study_id = "oc_primary_study",
  purpose  = "Analysis of tree cover in Orange County rural buffer and county-owned property",
  overlap_probability = 0.15,
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
      `_id`      = "y2017",
      year       = 2017,
      active     = TRUE,
      wms_server = "https://services.nconemap.gov/secure/services/Imagery/Orthoimagery_2017/ImageServer/WMSServer",
      version    = "1.3.0",
      layer      = "0"
    )
  )
)

primary_study <- append(list(primary_study_settings), unname(primary_points))
json_primary <- jsonlite::toJSON(primary_study, auto_unbox = TRUE) 
json_primary <-  stringr::str_replace_all(json_primary, "\\[\\]", "{}")
writeLines(paste0('{"docs" : ', json_primary, "}"), con = "study_data/primary_study.json")

# HOST="http://JX6U8nEcRckKohDdtqBvFzyPuG7kPY:FuFeFKp7k3VfepeWzdrvdazK4MHAhv@52.87.191.132:5984"
# 
# curl -X PUT "$HOST/oc_primary_study"
# curl -vX POST "$HOST/oc_primary_study/_bulk_docs" \
# -H "Content-type: application/json" \
# -d @study_data/primary_study.json

saveRDS(spl_data, file = "data/study_spatial_data.rds")
saveRDS(primary_points_a, file = "data/primary_points.rds")
## Plotting ####
plot(spl_data[["oc"]])
plot(spl_data[["rb"]], add = TRUE)
plot(spl_data[["cl"]], add = TRUE)

filter(primary_points_a, area == "rb") %>%
  { points(.$lon,
         .$lat,
         pch = 3, cex = .1,
         col = "#bebada") }
filter(primary_points_a, area == "cl") %>%
  {points(.$lon,
         .$lat,
         pch = 3, cex = .1,
         col = "#fb8072")}
filter(primary_points_a, area == "oc") %>%
  {points(.$lon,
         .$lat,
         pch = 3, cex = .1,
         col = "#8dd3c7")}



