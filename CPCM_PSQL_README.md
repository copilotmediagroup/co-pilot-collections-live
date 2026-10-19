# Local psql client for Mojave

A repo-local PostgreSQL 15.15 `psql` client was compiled from official PostgreSQL source for this Intel macOS 10.14.6 machine.

Binary: `.tools/pgsql15/bin/psql`

This is a client only for Co Pilot Collections staging/database work. It does not replace macOS components and does not require an OS upgrade.

Example after obtaining a STAGING connection string:

```sh
.tools/pgsql15/bin/psql "$CPCM_STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f MULTI_TENANT_STAGING_BUNDLE.sql
```

Never point the staging bundle at LIVE (`bwvufgzbkaymffwxuuzr`). Phase 8 remains a post-isolation cutover step.
