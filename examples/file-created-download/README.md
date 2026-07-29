# `file.created` → download

A minimal, dependency-free webhook receiver that **verifies the signature** and, on
`file.created`, **fetches a fresh presigned download URL** for the new file.

## Run it

1. Start the receiver. Get the secret from `pixwel listen`'s output; use your own `pat_` token:

   ```bash
   PIXWEL_WEBHOOK_SECRET=whsec_… PIXWEL_TOKEN=pat_… node receiver.js
   ```

2. Point the CLI at it (another terminal):

   ```bash
   pixwel listen --forward-to localhost:4000/webhooks
   ```

3. Fire a test event (a third terminal):

   ```bash
   pixwel trigger file.created
   ```

The receiver verifies the signature and resolves a download URL. A `trigger` test event
references a **fixture** file, so the download endpoint returns `404` — create/edit a real file
to see an actual presigned URL and bytes.

## What it demonstrates

- **Signature verification.** `Pixwel-Signature: t=<ts>,v1=<hmac>` where
  `hmac = HMAC-SHA256(secret, "<ts>.<rawBody>")`. Verify against the **raw** request body
  (not a re-serialized object), compare in constant time, and reject stale timestamps.
- **Fetch-back for files.** File payloads carry a stable `data.object.download` URL. Call it
  with your token to get a short-lived presigned S3 URL **on demand** — so the durable,
  retried/replayed webhook body never holds an expiring link.
- **Reporting.** Whatever status you return is recorded in **Preferences → Webhooks**; return
  `2xx` on success.

## Environment

| Var | Required | Purpose |
|---|---|---|
| `PIXWEL_WEBHOOK_SECRET` | yes | The `whsec_…` secret printed by `pixwel listen`, used to verify signatures. |
| `PIXWEL_TOKEN` | to download | Your `pat_…` token, sent as `Authorization: Bearer` when resolving the download URL. |
| `PORT` | no | Listen port (default `4000`). |
