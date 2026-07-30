# Pixwel CLI

`pixwel` is a command-line tool for building and testing [Pixwel](https://pixwel.com) API
integrations. Receive live webhook events on your own machine, replay them against your local
server, and fire test events on demand — without deploying anything or waiting for real activity.

<p align="center">
  <img src="./demo/demo.gif"
       alt="pixwel login, then pixwel listen streaming webhook events, then the same events in the --tui dashboard"
       width="900"><br>
  <sub><code>pixwel login</code>, then <code>pixwel listen</code> — and the same events in <code>--tui</code>.</sub>
</p>

**With the Pixwel CLI, you can:**

- Receive webhook events on `localhost` — no tunnel, no public URL, works from behind a firewall
- Forward events to your local endpoint, or watch them stream in your terminal
- Trigger test webhook events (`asset.updated`, `file.created`, …) on demand
- Verify signatures against a real, stable signing secret
- Authenticate securely with a personal access token

It's a single, dependency-free binary for macOS, Linux, and Windows.

## Installation

### Homebrew (macOS & Linux)

```bash
brew install Pixwel/tap/pixwel
```

Recommended on macOS — Homebrew installs aren't quarantined, so you skip the Gatekeeper prompt.

### Direct download

Download the archive for your platform from the
[latest release](https://github.com/Pixwel/pixwel-cli/releases/latest):

| Platform | Asset |
|---|---|
| macOS · Apple Silicon | `pixwel_<version>_darwin_arm64.tar.gz` |
| macOS · Intel | `pixwel_<version>_darwin_amd64.tar.gz` |
| Linux · x86-64 | `pixwel_<version>_linux_amd64.tar.gz` |
| Linux · ARM64 | `pixwel_<version>_linux_arm64.tar.gz` |
| Windows · x86-64 | `pixwel_<version>_windows_amd64.zip` |

Downloading with `curl` (rather than a browser) also avoids macOS quarantine:

```bash
curl -L -o pixwel.tar.gz \
  https://github.com/Pixwel/pixwel-cli/releases/latest/download/pixwel_<version>_darwin_arm64.tar.gz
tar -xzf pixwel.tar.gz
sudo mv pixwel /usr/local/bin/
pixwel --version
```

On Windows, unzip the archive and add `pixwel.exe` to your `PATH`.

> **macOS: "cannot be opened because it is from an unidentified developer"?**
> The binaries aren't Apple-notarized yet. Install via Homebrew (above), or clear the quarantine
> flag once on a downloaded binary:
> ```bash
> xattr -dr com.apple.quarantine /usr/local/bin/pixwel
> ```
> (or right-click the binary → Open, or allow it under System Settings → Privacy & Security).

## Usage

Authenticate once, then start listening:

```bash
pixwel login
pixwel listen --forward-to localhost:3000/webhooks
```

`listen` registers an endpoint, prints your signing secret, and streams events to your local
server:

```
╭──────────────────────────────────────────────────────────╮
│  Ready — listening for webhook events                    │
│                                                          │
│  Forwarding to   http://localhost:3000/webhooks          │
│  Signing secret  whsec_3f9a…                             │
│  Events          all                                     │
╰──────────────────────────────────────────────────────────╯
Ctrl-C to stop.

10:04:12  asset.updated                 → 200 OK
10:04:19  workrequest.approved          → 500
```

Drop `--forward-to` to watch events print in the terminal instead — each one syntax-highlighted, as
in the recording above. `--events asset.updated,file.created` narrows what you subscribe to, and
`--reset-secret` rolls the signing secret.

### The dashboard

Add `--tui` for a full-screen view instead of a scrolling log — the deliveries down one side, the
selected payload on the other:

```bash
pixwel listen --tui --forward-to localhost:3000/webhooks
```

| Key | |
|---|---|
| `↑` `↓` (or `k` `j`) | move through the deliveries |
| `f` | follow the newest delivery again |
| `h` | show the signed headers above the payload |
| `r` | replay the selected delivery to your `--forward-to` URL |
| `q` | quit |

Replay re-sends the delivery exactly as it arrived, same body and same `Pixwel-Signature` — so you
can fix your handler and try the identical event again without waiting for another one.

The plain log is still the default: it scrolls back, greps, and pastes into a bug report, which a
full-screen view can't.

### Commands

| Command | Description |
|---|---|
| `pixwel login` | Authenticate and store a token (production by default; `--host`/`--choose-host` to change). Use `--token pat_…` for two-factor accounts. |
| `pixwel logout` | Forget stored credentials. |
| `pixwel whoami` | Show the active account and environment. |
| `pixwel listen [--forward-to <url>]` | Stream events to a local URL or the terminal. `--tui` for the dashboard, `--events a,b` to filter, `--reset-secret` to roll the secret. |
| `pixwel trigger [event]` | Send a test event. Omit the event to pick one from a filterable list. |
| `pixwel upload offline <file>` | Upload an offline preview to a work request. `--work-request` (required), `--tag`. |
| `pixwel upload final <file>` | Upload a final file to a work request; creates an ingest. `--work-request` (required), `--tag`. |
| `pixwel download <file-id>` | Download a file's contents (S3-backed or Mongo-stored). `-o` for the output path. |
| `pixwel get\|post\|patch\|put\|delete <path>` | Raw request to any API path. `-q` query params (get), `-d`/`--json` body, `--dry-run`. |

Run `pixwel <command> --help` for the full options of any command.

## Upload files

Upload offlines and final deliverables to a work request the same way the platform does — the CLI
requests a direct-to-S3 authorization, streams the file up, and records it:

```bash
# an offline preview
pixwel upload offline --work-request 6a6a… --tag "COMING SOON" ./offline.mov

# a final delivery — also creates an ingest, which kicks off processing
pixwel upload final --work-request 6a6a… --tag "COMING SOON" ./final.mov
```

Both show a live progress meter — bytes transferred, percentage, and rate — while the file streams
(and stay quiet when output isn't a terminal, so CI logs don't fill up with redraws).

`--tag` is required when the work request has tags. You need upload permission on the work request
(the same access the API enforces). Files go up over a single S3 POST, which suits offlines and
modest finals; multi-gigabyte masters are still best delivered via Aspera.

## Download files

Fetch a file's bytes by id — one command whether the file lives in S3 or in Mongo (posters,
thumbnails):

```bash
pixwel download <file-id>              # saves to a filename derived from the file
pixwel download <file-id> -o out.jpg   # or a path you choose
```

Behind one URL: S3-backed files redirect to a short-lived presigned URL; Mongo-stored blobs stream
straight from the API. To inspect the record instead of the bytes, use `pixwel get /files/<id>`.

<p align="center">
  <img src="./demo/files.gif"
       alt="pixwel upload offline streaming a file up with a progress meter, then pixwel download fetching one back"
       width="900"><br>
  <sub>Uploading an offline, then fetching a file back by id.</sub>
</p>

## Raw API requests

For anything without a dedicated command, hit the API directly with your stored token — like
Stripe's `get`/`post`, plus `patch`/`put` (the Pixwel API updates via PATCH, not POST):

```bash
pixwel get /workrequests/6a6a…                          # read
pixwel get /workrequests -q status=submitted             # with query params
pixwel patch /workrequests/6a6a… -d status=in_progress   # update a work request's status
pixwel post /offlines -d workRequest=6a6a… -d path=…      # create
pixwel delete /offlines/6a6a…                            # delete
```

`-d key=value` sends a string; `-d key:=<json>` sends a typed or nested value (`-d count:=3`,
`-d source.url=s3://…`); `--json '<raw>'` sends an exact body. Add `--dry-run` to preview the
request without sending it. Responses are pretty-printed JSON.

## How `listen` works

Your listener registers a `cli` endpoint that Pixwel never POSTs to — instead the CLI pulls queued
events down and replays them locally, which is why it works from behind a firewall with no tunnel.
The signature is the real thing: the body is forwarded byte-for-byte with the same
`Pixwel-Signature` header a production delivery carries, so your verification code is genuinely
exercised. The signing secret stays stable across runs, and whatever your endpoint returns is
reported back — so the delivery log under **Preferences → Webhooks** reflects reality.

Working examples — including a receiver that verifies the signature and fetches a file via its
presigned download URL — are in [`examples/`](./examples).

## Configuration

Credentials are stored in `~/.config/pixwel/config.json` (mode `600`). Set `PIXWEL_CONFIG` to
change the location.

Output adapts to wherever it lands: full color in a terminal that supports it, gracefully reduced on
one that doesn't, and plain text when piped or redirected — so `pixwel get … | jq` and CI logs stay
clean. `NO_COLOR=1` disables color everywhere; `CLICOLOR_FORCE=1` keeps it through a pipe.

`login` defaults to **production**; use
`pixwel login --host staging` (or `local`, or a full API base URL), or `--choose-host` for the
interactive environment picker. Set `PIXWEL_HOST` to change what a bare `pixwel login` targets —
handy in CI, where threading `--host` through every call is noise:

```bash
export PIXWEL_HOST=staging   # a name, or a full API base URL
pixwel login --token pat_…
```

### Crash reporting

The CLI reports **unexpected crashes and server-side (5xx) errors** to Sentry so we can fix bugs.
It never reports your routine errors, input, files, or credentials — credential-like strings are
scrubbed and no hostname is sent. Opt out any time with the standard `DO_NOT_TRACK=1`, or with
`PIXWEL_TELEMETRY=off`.

## Documentation

Full webhook documentation — the event catalog, payload shapes, and the signature-verification
recipe — is at [app.pixwel.com/docs/webhooks](https://app.pixwel.com/docs/webhooks).

## Feedback

Found a bug or have a request? [Open an issue](https://github.com/Pixwel/pixwel-cli/issues).
