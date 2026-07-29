# Integration examples

Runnable, dependency-free examples of what a Pixwel integration partner typically needs to do.
Each folder is one task; every example runs on Node 18+ with no `npm install`.

| Example | What it covers |
|---|---|
| [`file-created-download/`](./file-created-download) | Receive `file.created`, verify the `Pixwel-Signature`, and fetch the new file via its presigned `download` URL. |

Drive any of them locally with the CLI:

```bash
pixwel listen --forward-to localhost:4000/webhooks   # forward live events to your receiver
pixwel trigger <event>                               # or fire a test event on demand
```

_More to come — filtering events, handling retries/idempotency, per-event-type handlers._
