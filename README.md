# prophet-automation

Deployable runner service for the Prophet follow-up workflow.

## What this service does

- Reads follow-up rows from Google Sheets tab `Agent Follow Up`
- Loads email templates from `prophet-core`
- Drafts or sends via Gmail API
- Writes outcomes to `Email Log`

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

2. Fill env values.

3. Install dependencies:

```bash
npm install
```

4. Run local dry run:

```bash
npm run dev
```

## Gmail auth modes

### Personal Gmail mode

Set these in `.env`:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `GMAIL_FROM`

### Google Workspace mode (service account delegation)

Set these in `.env`:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GMAIL_IMPERSONATE_USER`
- `GMAIL_FROM`

Service account must have domain-wide delegation and Gmail + Sheets scopes approved by admin.

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
