#!/bin/sh

HOST="https://$COUCHDB_HOST"

curl -X PUT $HOST/_users \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD"

curl -X PUT $HOST/_users/org.couchdb.user:observer \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "observer",
    "password": "cfe2025",
    "roles": [],
    "type": "user"
  }'

curl -X PUT $HOST/oc_pilot_study_2025/_security \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{
    "members": {
      "names": ["observer"],
      "roles": []
    },
    "admins": {
      "names": [],
      "roles": ["_admin"]
    }
  }'