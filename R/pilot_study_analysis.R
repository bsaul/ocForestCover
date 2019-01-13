##
data <- readRDS("data/pilot_study_identifications_20190101.rds")

library(stringr)
library(dplyr)
data2 <- data %>%
  select(-X_rev) %>%
  tidyr::separate(
    X_id, into = c("id", "point", "time"), sep = "_"
  ) %>%
  select(-db) %>%
  filter(
    !(user %in% c("bradley@organicathlete.org", "charity.kirk@gmail.com"))
  )

# How many IDS have been made?
data2 %>%
  group_by(user) %>%
  tally()

# Time per ID?

temp <- data2 %>%
  mutate(
    timestamp = lubridate::ymd_hms(timestamp)
  ) %>%
  group_by(user) %>%
  mutate(
    secs = c(0, diff(timestamp))
  )

summary(temp$secs)
temp %>% summarise(median = median(secs))

# Number of unknowns

temp %>%
  group_by(user) %>%
  summarise(U = mean(value == "U"))


# Agreement across users
temp2 <- temp %>%
  select(user, point, time, value) %>%
  group_by(point, time) %>%
  summarise(
    tree = sum(value == "T", na.rm = TRUE),
    not  = sum(value == "N", na.rm = TRUE),
    unk  = sum(value == "U", na.rm = TRUE),
    done = sum(tree, not, unk)
  ) %>%
  mutate(
    agreement = ((tree == done) | (not == done) | (unk == done)) * 1
  )

mean(temp2$agreement)

# How many disagreements were not due to unknown

temp2 %>% filter(agreement == 0, unk == 0)

# Results among agreements

temp3 <- temp2 %>% filter(agreement == 1) %>%
  group_by(point) %>%
  filter(n() > 1) %>%
  mutate(tree = (tree > 0) * 1) %>%
  select(point, time, tree)

temp3 %>%
  group_by(time) %>%
  summarise(m = mean(tree))


temp %>%
  filter(user == "bradleysaul@gmail.com") %>%
  group_by(time) %>%
  summarise(t = mean(value == "T"))
  

