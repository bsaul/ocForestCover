#!/bin/sh

HOST="https://$COUCHDB_HOST"

# Enable CORS
curl -X PUT $HOST/_node/_local/_config/httpd/enable_cors \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '"true"'

# Allow all origins (or replace * with your domain)
curl -X PUT $HOST/_node/_local/_config/cors/origins \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '"*"'

# Allow methods
curl -X PUT $HOST/_node/_local/_config/cors/methods \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '"GET, PUT, POST, HEAD, DELETE"'

# Allow headers
curl -X PUT $HOST/_node/_local/_config/cors/headers \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '"accept, authorization, content-type, origin, referer"'

# If you need cookies/auth from browser:
curl -X PUT $HOST/_node/_local/_config/cors/credentials \
  -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '"true"'


# Check current CORS settings
# curl -X GET $HOST/_node/_local/_config/httpd \
#   -u "$COUCHDB_USER:$COUCHDB_PASSWORD"

# Can you access the database with admin creds?
# curl -X GET $HOST/oc_pilot_study_2025/study_settings \
#   -u "$COUCHDB_USER:$COUCHDB_PASSWORD"

# Set authentication handlers for chttpd (clustered interface)
# curl -X PUT $HOST/_node/_local/_config/chttpd/authentication_handlers \
#   -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
#   -d '"{couch_httpd_auth, cookie_authentication_handler}, {couch_httpd_auth, default_authentication_handler}"'


# See if cookie auth is enabled
# curl -X GET $HOST/_node/_local/_config/chttpd/authentication_handlers \
  # -u "$COUCHDB_USER:$COUCHDB_PASSWORD"



# # Enable CORS
# curl -X PUT $HOST/_node/_local/_config/httpd/enable_cors \
#   -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
#   -d '"true"'

# # Set CORS origins (replace with your actual Netlify domain)
# curl -X PUT $HOST/_node/_local/_config/cors/origins \
#   -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
#   -d '"https://deploy-preview-30--eloquent-northcutt-848512.netlify.app/"'



# # Allow credentials
# curl -X PUT $HOST/_node/_local/_config/cors/credentials \
#   -u "$COUCHDB_USER:$COUCHDB_PASSWORD" \
#   -d '"true"'