#------------------------------------------------------------------------------#
#  TITLE: Create HTML files to review point ids within each observed pattern
#         (N->N, T->N, etc)
#   DATE: 20190511
#   PROG: B Saul
#   DESC: 
#------------------------------------------------------------------------------#

library(leaflet)
library(mapview)
library(htmlwidgets)

validation_points <- readRDS(here::here("data", "validation_study_20190511.rds")) %>%
  ungroup() %>%
  arrange(point) %>%
  mutate(
    validation_order = 1:n()
  ) 

for(i in 1:nrow(validation_points)){
  
  if(i < nrow(validation_points)){
    next_link <- sprintf("%s_%s.html", 
                         validation_points[i + 1, "validation_order"],
                         validation_points[i + 1, "point"])
  }

  
  rmarkdown::render(
    input       = "R/validation_study_html_template.Rmd",
    output_file = sprintf("%s_%s.html", 
                          validation_points[i, "validation_order"],
                          validation_points[i, "point"]),
    output_dir  = here::here("study_data", "validation_study"),
    params      = list(point_data = validation_points[i, ],
                       next_link = next_link)
  )
}

