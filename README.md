# Pixwel CLI

`pixwel` is a command-line tool for building and testing [Pixwel](https://pixwel.com) API
integrations. Receive live webhook events on your own machine, replay them against your local
server, and fire test events on demand — without deploying anything or waiting for real activity.

**With the Pixwel CLI, you can:**

- Receive webhook events on `localhost` — no tunnel, no public URL, works from behind a firewall
- Forward events to your local endpoint, or watch them stream in your terminal
- Trigger test webhook events (`asset.updated`, `file.created`, …) on demand
- Verify signatures against a real, stable signing secret
- Authenticate securely with a personal access token

It's a single, dependency-free binary for macOS, Linux, and Windows.

## Installation

Download the archive for your platform from the
[latest release](https://github.com/Pixwel/pixwel-cli/releases/latest):

| Platform | Asset |
|---|---|
| macOS · Apple Silicon | `pixwel_<version>_darwin_arm64.tar.gz` |
| macOS · Intel | `pixwel_<version>_darwin_amd64.tar.gz` |
| Linux · x86-64 | `pixwel_<version>_linux_amd64.tar.gz` |
| Linux · ARM64 | `pixwel_<version>_linux_arm64.tar.gz` |
| Windows · x86-64 | `pixwel_<version>_windows_amd64.zip` |

Extract it and put `pixwel` on your `PATH`:

```bash
tar -xzf pixwel_*.tar.gz
sudo mv pixwel /usr/local/bin/
pixwel --version
```

On Windows, unzip the archive and add `pixwel.exe` to your `PATH`.

## Usage

Authenticate once, then start listening:

```bash
pixwel login
pixwel listen --forward-to localhost:3000/webhooks
```

`listen` registers an endpoint, prints your signing secret, and streams events to your local
server:

```
Ready. Forwarding events to http://localhost:3000/webhooks
Signing secret: whsec_3f9a…
Events: all

10:04:12  asset.updated                 -> 200 OK
10:04:19  work_request.completed        -> 500
```

Drop `--forward-to` to watch events print in the terminal instead. In a second terminal, fire a
test event without touching real data:

```bash
pixwel trigger asset.updated
```

### Commands

| Command | Description |
|---|---|
| `pixwel login` | Authenticate and store a token. Use `--token pat_…` for two-factor accounts. |
| `pixwel logout` | Forget stored credentials. |
| `pixwel whoami` | Show the active account and environment. |
| `pixwel listen [--forward-to <url>]` | Stream events to a local URL or the terminal. `--events a,b` to filter, `--reset-secret` to roll the secret. |
| `pixwel trigger [event]` | Send a test event. Omit the event to list what's available. |

Run `pixwel <command> --help` for the full options of any command.

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
change the location and `NO_COLOR=1` to disable color. Point at a different environment with
`pixwel login --host staging` (`production`, `staging`, or a full API base URL).

## Documentation

Full webhook documentation — the event catalog, payload shapes, and the signature-verification
recipe — is at [app.pixwel.com/docs/webhooks](https://app.pixwel.com/docs/webhooks).

## Feedback

Found a bug or have a request? [Open an issue](https://github.com/Pixwel/pixwel-cli/issues).
