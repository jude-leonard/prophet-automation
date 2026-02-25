# prophet-automation

Deployable runner service for the Prophet follow-up workflow.

## What this service does

- Reads follow-up rows from Google Sheets tab `Agent Follow Up`
- Loads email templates from local `templates/email` first
- Falls back to `prophet-core` templates if available
- Drafts or sends via Gmail API
- Writes outcomes to `Email Log`
- Prints skip/fail diagnostics for fast troubleshooting

## Template source order

1. Local templates in this repo: `templates/email/*.md` (recommended for deploy stability)
2. `prophet-core` submodule/sibling if present

Default included template:

- `templates/email/follow_up.md`

## Optional submodule setup

If you want full template parity with `prophet-core`, add it as submodule:

```bash
git submodule add https://github.com/jude-leonard/prophet-core.git prophet-core
git submodule update --init --recursive
```

## Setup

```bash
cp .env.example .env
npm install
npm run oauth:token
npm start
```

## Required env vars (Personal Gmail OAuth)

- `NODE_ENV=production`
- `DRY_RUN=true|false`
- `SHEET_ID`
- `FOLLOW_UP_TAB` (default `Agent Follow Up`)
- `EMAIL_LOG_TAB` (default `Email Log`)
- `GMAIL_FROM`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth2callback`
- `GOOGLE_OAUTH_REFRESH_TOKEN`

## Sheet column expectations

Recipient columns supported:

- `email`, `recipient_email`, `to`, `email_address`, `client_email`, `lead_email`
- Any column containing `email` with valid email values

Optional gate columns:

- `should_send`, `run`, `send`, `ready_to_send`

Accepted gate values:

- `yes`, `y`, `true`, `1`, `send`, `ready`, `go`, `approved`

If gate is blank, the row is treated as sendable.

## Log columns written to `Email Log`

1. timestamp ISO
2. source row number
3. recipient
4. subject
5. template key
6. outcome (`drafted`, `sent`, `failed`)
7. gmail message/draft id
8. error text
