library(spatial)
library(rgdal)
library(dplyr)
library(sp)

projproj <- function(x) spTransform(x, CRS("+init=epsg:4326"))

oc_boundary <- readOGR(dsn = "inst/extdata/county", layer = "CountyLine",
                       stringsAsFactors = FALSE) 
oc_zones    <- readOGR(dsn = "inst/extdata/Zoning_and_Overlays", layer = "Zoning",
                       stringsAsFactors = FALSE) 
oc_parks    <- readOGR(dsn = "inst/extdata/ParklandOpenSpace", layer = "oc",
                       stringsAsFactors = FALSE) 


oc_rb       <- oc_zones[oc_zones$Zoning_Def == "Rural Buffer", ]


z <- spsample(oc_rb, 1000, type = "random")
z <- spsample(oc_parks, 1000, type = "random")
z
plot(oc_boundary)
plot(oc_rb, add = TRUE)
plot(oc_parks, add = TRUE)
points(z, pch = 3, cex = .1)
