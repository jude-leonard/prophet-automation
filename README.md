# prophet-automation

Deployable runner service for the Prophet follow-up workflow.

## What this service does

- Reads follow-up rows from Google Sheets tab `Agent Follow Up`
- Loads email templates from `prophet-core`
- Drafts or sends via Gmail API
- Writes outcomes to `Email Log`
- Prints skip diagnostics so sheet issues are easy to fix

## Required repo layout

This service expects `prophet-core` to exist either:

- as a submodule at `./prophet-core` (recommended for Railway), or
- as a sibling folder `../prophet-core` (local dev fallback).

Recommended setup:

```bash
git submodule add git@github.com:jude-leonard/prophet-core.git prophet-core
git submodule update --init --recursive
```

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Fill `.env` values.

4. Run local dry run:

```bash
npm run dev
```

## Personal Gmail OAuth setup (recommended for you)

1. In Google Cloud Console, create/select a project.
2. Enable `Gmail API` and `Google Sheets API`.
3. Configure OAuth consent screen (External is fine), add your Gmail as a test user.
4. Create OAuth Client ID of type `Web application`.
5. Add redirect URI: `http://localhost:3000/oauth2callback`.
6. Put these in `.env`:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI` (default already set)
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GMAIL_FROM` (your sender Gmail)
- `SHEET_ID`

7. Run:

```bash
npm start
```

## Sheet column expectations

Recipient column can be any of:

- `email`
- `recipient_email`
- `to`
- `email_address`
- `client_email`
- `lead_email`
- any other column containing `email` with valid email values

Optional gate columns (if present) can be any of:

- `should_send`
- `run`
- `send`
- `ready_to_send`

Accepted gate values:

- `yes`, `y`, `true`, `1`, `send`, `ready`, `go`, `approved`

If no gate value is set, row is treated as sendable.

## Service account mode (optional)

Set these in `.env`:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GMAIL_IMPERSONATE_USER` (Workspace only)
- `GMAIL_FROM`

## Run modes

- `DRY_RUN=true`: create Gmail drafts only
- `DRY_RUN=false`: send real emails

## Deploy to Railway

- Connect GitHub repo `prophet-automation`
- Ensure submodules are fetched during deploy (Railway setting or prebuild step)
- Set all environment variables in Railway
- Start command: `npm start`
- Add a scheduled trigger to run `node src/index.js`

## Log columns written to `Email Log`

1. timestamp ISO
2. source row number
3. recipient
4. subject
5. template key
6. outcome (`drafted`, `sent`, `failed`)
7. gmail message/draft id
8. error text
