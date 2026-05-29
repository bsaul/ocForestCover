#!/bin/sh
set -eu

# Back up every CouchDB database to JSON files (one per db).
#
# Usage:  scripts/backup_db.sh [output-dir]
# Default output: data/backup_YYYYMMDD
#
# Requires env: COUCHDB_HOST, COUCHDB_USER, COUCHDB_PASSWORD (loaded via .envrc).
#
# Each file contains the full `_all_docs?include_docs=true` response for that
# database and can be re-imported with `_bulk_docs`.

: "${COUCHDB_HOST:?COUCHDB_HOST not set}"
: "${COUCHDB_USER:?COUCHDB_USER not set}"
: "${COUCHDB_PASSWORD:?COUCHDB_PASSWORD not set}"

OUT="${1:-data/backup_$(date +%Y%m%d)}"
mkdir -p "$OUT"

HOST="https://$COUCHDB_HOST"
AUTH="$COUCHDB_USER:$COUCHDB_PASSWORD"

echo "Listing databases on $COUCHDB_HOST ..."
DBS=$(curl -fsS -u "$AUTH" "$HOST/_all_dbs" | tr -d '[]"' | tr ',' '\n')

count=0
for db in $DBS; do
  [ -z "$db" ] && continue
  out_file="$OUT/${db}.json"
  printf '  -> %s\n' "$db"
  curl -fsS -u "$AUTH" \
    "$HOST/$db/_all_docs?include_docs=true" \
    -o "$out_file"
  count=$((count + 1))
done

echo "Wrote $count databases to $OUT"
