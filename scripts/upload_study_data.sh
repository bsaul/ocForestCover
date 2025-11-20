#!/bin/sh

DATA=$1
HOST="https://$COUCHDB_HOST"

curl -X PUT "$HOST/$DATA" \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD"
  
curl -vX POST "$HOST/$DATA/_bulk_docs" \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-type: application/json" \
  -d @study_data/$DATA.json