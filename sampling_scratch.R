library(spatial)
library(rgdal)
library(dplyr)
library(sp)

projproj <- function(x) spTransform(x, CRS("+init=epsg:4326"))

oc_boundary <- readOGR(dsn = "extdata/county",
                       layer = "CountyLine",
                       stringsAsFactors = FALSE) %>%
  projproj
oc_zones    <- readOGR(dsn = "extdata/Zoning_and_Overlays",
                       layer = "Zoning",
                       stringsAsFactors = FALSE) %>%
  projproj
oc_parks    <- readOGR(dsn = "extdata/ParklandOpenSpace", 
                       layer = "oc",
                       stringsAsFactors = FALSE) %>%
  projproj
oc_easement <- readOGR(dsn = "extdata/Easements_Roads_utilities",
                       layer = "Easements_Roads_utilities",
                       stringsAsFactors = FALSE) %>%
  projproj


oc_rb       <- oc_zones[oc_zones$Zoning_Def == "Rural Buffer", ]


rb_sample_points <- spsample(oc_rb, 1000, type = "random")
pk_sample_points <- spsample(oc_parks, 1000, type = "random")

writeLines(paste0("points = ", jsonlite::toJSON(as.data.frame(rb_sample_points[1:2, ]))),
           con = "www/test.json")

# plot(oc_boundary)
# plot(oc_rb, add = TRUE)
# plot(oc_parks, add = TRUE)
# points(z, pch = 3, cex = .1)



