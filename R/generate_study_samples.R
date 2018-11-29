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
      id   = sprintf("p%s", formatC(1:(.n*length(.area_list)), width = 6, flag = "0"))
    )
}


#------------------------------------------------------------------------------#
## Simple random sample for pilot study ####
#------------------------------------------------------------------------------#

n <- 50
pilot_points <- sample_study_points(spl_data, n, 321)
json_pilot_points <- jsonlite::toJSON(pilot_points)

writeLines(paste0("points = ", json_pilot_points, ";"), con = "www/pilot_study.json")

#------------------------------------------------------------------------------#
## Simple random sample for main study ####
#------------------------------------------------------------------------------#


## Plotting ####
# plot(oc_boundary)
# plot(oc_rb, add = TRUE)
# plot(oc_parks, add = TRUE)
# points(z, pch = 3, cex = .1)



