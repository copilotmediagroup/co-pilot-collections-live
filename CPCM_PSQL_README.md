# Local psql client for Mojave

A repo-local PostgreSQL 15.15 `psql` client was compiled from official PostgreSQL source for this Intel macOS 10.14.6 machine.

Binary: `.tools/pgsql15/bin/psql`

This is a client only for Co Pilot Collections staging/database work. It does not replace macOS components and does not require an OS upgrade.

Example after obtaining a STAGING connection string:

```sh
.tools/pgsql15/bin/psql "$CPCM_STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f MULTI_TENANT_STAGING_BUNDLE.sql
```

Never point the staging bundle at LIVE (`bwvufgzbkaymffwxuuzr`). Phase 8 remains a post-isolation cutover step.

## Safe staging execution wrapper
`CPCM_STAGING_CONNECT.sh` uses the repo-local psql client. It refuses the known LIVE Collections, Usecurity, and Datamarkethouse project refs. By default it only verifies connectivity. Applying the staging bundle additionally requires `CPCM_APPLY_STAGING_BUNDLE=YES`.

For Supabase, copy the exact Session pooler connection string from the staging project's **Connect** panel and replace the password placeholder. Session mode is useful when the Mac/network cannot use the project's direct IPv6 endpoint.
