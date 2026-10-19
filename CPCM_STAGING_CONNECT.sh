#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
PSQL="$ROOT/.tools/pgsql15ssl/bin/psql"
OPENSSL="$ROOT/.tools/openssl11/lib"
PGLIB="$ROOT/.tools/pgsql15ssl/lib"
BUNDLE="$ROOT/MULTI_TENANT_STAGING_BUNDLE.sql"
: "${CPCM_STAGING_DB_URL:?Set CPCM_STAGING_DB_URL to the disposable/staging Supabase Session pooler or direct connection string}"
[ -x "$PSQL" ] || { echo 'Missing SSL-capable repo-local psql client'; exit 2; }
export DYLD_LIBRARY_PATH="$PGLIB:$OPENSSL${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
[ -f "$BUNDLE" ] || { echo 'Missing staging bundle'; exit 2; }
case "$CPCM_STAGING_DB_URL" in
  *nixqpmgkmrzjsaqhqqew*) : ;;
  *) echo 'REFUSING: only Co Pilot Collections Demo (nixqpmgkmrzjsaqhqqew) is permitted by this staging runner.' >&2; exit 9;;
esac
case "$CPCM_STAGING_DB_URL" in
  *bwvufgzbkaymffwxuuzr*) echo 'REFUSING: LIVE Collections project detected.' >&2; exit 10;;
  *eznhyemkuxectndxtymc*) echo 'REFUSING: Usecurity project detected.' >&2; exit 11;;
  *ixqprtabkyurqlqskjxi*) echo 'REFUSING: Datamarkethouse project detected.' >&2; exit 12;;
esac
export PGCONNECT_TIMEOUT=10
"$PSQL" "$CPCM_STAGING_DB_URL" -X -v ON_ERROR_STOP=1 -c "select current_database() db,current_user db_user,version();"
if [ "${CPCM_APPLY_STAGING_BUNDLE:-NO}" != "YES" ]; then
  echo 'Connection verified. Bundle NOT applied. Set CPCM_APPLY_STAGING_BUNDLE=YES only for a disposable staging database.'
  exit 0
fi
"$PSQL" "$CPCM_STAGING_DB_URL" -X -v ON_ERROR_STOP=1 -f "$BUNDLE"
echo 'Staging bundle completed. Run Agency A/B isolation tests before Phase 8.'
