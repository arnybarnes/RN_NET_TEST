# Public Repo Notes

This repository is intended to be safe to share publicly.

## Keep Out Of Git

- real Azure subscription or tenant exports
- connection strings, passwords, API keys, and tokens
- populated `local.settings.json`
- populated `.env` files
- local SQLite database files
- screenshots that show portal/account details

## Safe Sharing Pattern

- commit example config files only
- use placeholder values in docs
- store deployed secrets in Azure app settings
- store local secrets outside git

## Before Publishing

- scan tracked files for emails, IDs, and secrets
- confirm only example config files are present
- verify no secret was committed in earlier history
