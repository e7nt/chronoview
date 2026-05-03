# Security policy

## Reporting a vulnerability

Please report security issues **privately** to `admin@e7nt.com` rather than opening a public GitHub issue.

When reporting, include:

- A description of the vulnerability and its impact
- Steps to reproduce (a proof-of-concept is ideal)
- The commit or version you tested against
- Your name / handle, if you'd like to be credited

We will acknowledge receipt within **3 business days** and aim to provide a remediation plan within **14 days** for confirmed issues. We'll keep you in the loop while we work on a fix and coordinate disclosure timing with you.

## Supported versions

Chronoview is pre-1.0. We currently only patch the `main` branch. Once we cut a 1.0 release, this policy will be updated to cover the latest minor.

## Known operational gotchas (not vulnerabilities, but worth flagging)

- `SECRET_KEY` must be overridden in any deployment. The default in `server/app/config.py` is a development placeholder.
- `DEV_MODE` defaults to `false` in code. Setting it to `true` disables authentication and falls back to a seeded user — only ever use this locally.
- `CORS_ORIGINS` defaults to `http://localhost:5173`. Set this to your real frontend origin in production.
