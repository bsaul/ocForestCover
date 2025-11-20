#!/bin/sh

HOST="https://$COUCHDB_HOST"

# Check current CORS settings
curl -X GET $HOST/_node/_local/_config/httpd \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD"

# Enable CORS
curl -X PUT $HOST/_node/_local/_config/httpd/enable_cors \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -d '"true"'

# Set CORS origins (replace with your actual Netlify domain)
curl -X PUT $HOST/_node/_local/_config/cors/origins \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -d '"https://eloquent-northcutt-848512.netlify.app/"'

# Allow credentials
curl -X PUT $HOST/_node/_local/_config/cors/credentials \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -d '"true"'