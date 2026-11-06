# Ruumble

[![Server release](https://img.shields.io/github/v/release/ruumble-project/ruumble-server?label=server)](https://github.com/ruumble-project/ruumble-server/releases/latest) [![Client release](https://img.shields.io/github/v/release/ruumble-project/ruumble-client?label=client)](https://github.com/ruumble-project/ruumble-client/releases/latest) [![What's new](https://img.shields.io/badge/what's%20new-release%20notes-0078be)](docs/whats-new/README.md) [![CI](https://github.com/ruumble-project/ruumble-server/actions/workflows/ci.yml/badge.svg)](https://github.com/ruumble-project/ruumble-server/actions/workflows/ci.yml) [![License](https://img.shields.io/github/license/ruumble-project/ruumble-server)](LICENSE)

The service, the web UI and the Mumble plugin of **Ruumble**, which shows a [Mumble](https://www.mumble.info/) server as an office building.

> **New to Ruumble?** The [project page](https://github.com/ruumble-project) shows what it is, a short demo and whether it fits your team. This README is about running and building it.

## Get started

**As a user**, pick one of two ways (details in the [user guide](docs/user-guide.md)):

- **Ruumble Client** (Linux, recommended): a Mumble client with Ruumble built in, one window, no plugin and no browser tab. Download the AppImage, .deb, .rpm or Arch package from the [latest client release](https://github.com/ruumble-project/ruumble-client/releases/latest) and connect to your server. It offers to take over an installed Mumble with its certificate and servers.
- **The plugin** in your own Mumble client (Linux or Windows):
  1. Download the plugin from the Ruumble address (`…/download`) and install it in Mumble under *Configure → Settings → Plugins*.
  2. Connect to the server: the plugin opens your browser with a pairing link.
  3. From then on, open Ruumble at its address. That's it.

**As a server operator** (Docker; details and the setup next to an existing Mumble container in the [operations guide](docs/operations.md)), a new Mumble server with Ruumble, in an empty folder:

```sh
curl -fsSLO https://raw.githubusercontent.com/ruumble-project/ruumble-server/main/deploy/compose/mumble-with-ruumble.docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/ruumble-project/ruumble-server/main/deploy/compose/setup.sh
sh setup.sh && docker compose up -d
```

Then add the line `setup.sh` prints, e.g. `ruumble: http://192.168.1.10:64080`, to the description of the root channel in Mumble. That is how Ruumble Client and the plugins find Ruumble.

## Releases and what's new

| | |
|---|---|
| **What's new** | The [release notes for users](docs/whats-new/README.md): what changed in each version, in plain words and with pictures, the newest version on top. "What's new" in Ruumble's user menu opens the page of the version you use. |
| **Server** (service, web UI, plugin) | [Latest server release](https://github.com/ruumble-project/ruumble-server/releases/latest): the Docker image `ghcr.io/ruumble-project/ruumble`, the plugin bundle and the Compose templates · [all server releases](https://github.com/ruumble-project/ruumble-server/releases) · [changelog](CHANGELOG.md) |
| **Ruumble Client** | [Latest client release](https://github.com/ruumble-project/ruumble-client/releases/latest): AppImage and Linux packages · [all client releases](https://github.com/ruumble-project/ruumble-client/releases) · [changelog](https://github.com/ruumble-project/ruumble-client/blob/main/CHANGELOG.md) |

Server and client have their own version numbers; any client works with older and newer servers.

## Requirements

| | |
|---|---|
| Mumble server | 1.5 or newer, with Ice enabled (tested: 1.5.735, 1.6.870) |
| Ruumble Client | Linux (x86_64) |
| Mumble client with the plugin | 1.4 or newer on **Linux** (x86_64) or **Windows** (x64); one plugin file for both. No macOS plugin yet. |
| Service | Docker, network access to the Mumble server's Ice port |
| Browser | a current Firefox, Chrome or Edge |

---

## For developers and the team

> [!IMPORTANT]
> **[Open the team Kanban board](https://github.com/orgs/ruumble-project/projects/1)**: tickets of ruumble-client and ruumble-server, who works on what and the status of each.
> You need access to the Ruumble organization; if the page shows a 404, ask a maintainer to add you to the board.

### How it works

```
Browser ──http(s)──▶ Ruumble service ──Ice (read-only)──▶ Mumble server
                          ▲
                          │ WebSocket (outgoing)
                     Ruumble plugin ──plugin API──▶ Mumble client (audio unchanged)
```

- The **service** (`bridge/`) reads the channel tree and user state via Ice, **read-only**. It serves the web UI, forwards commands to the plugin and stores the boards.
- The **plugin** (`plugin/`) tells the service who you are and when you talk, and carries out moves, mute and deafen in your own client. It only opens an outgoing connection.
- The **web UI** (`web/`, Svelte) derives the building from the channel tree.
- **Ruumble Client** ([ruumble-project/ruumble-client](https://github.com/ruumble-project/ruumble-client)) is a Mumble 1.6 client with the plugin's core built in and the web UI as its whole window; it keeps its settings and certificate apart from an installed official Mumble. Building it and native packages: see that repo.
- Talking state goes only to your own browser and is never stored. More in the [architecture decisions](docs/decisions/README.md).

### Documentation

| For | Guide |
|---|---|
| Users | [docs/user-guide.md](docs/user-guide.md): install the plugin, pair, use Ruumble |
| Operators | [docs/operations.md](docs/operations.md): set up Ruumble next to a Mumble server; from there HTTPS, backups and updates, troubleshooting |
| Developers | [docs/development.md](docs/development.md): build, test · [docs/releasing.md](docs/releasing.md): publishing a release and the "What's new" page |
| Everyone | [CHANGELOG.md](CHANGELOG.md), [features and plans](docs/features.md), [Mumble interfaces used](docs/mumble-interfaces.md) |

### Icons

The Ruumble icon for portals, dashboards and bookmarks: [ruumble-icons.zip](https://github.com/ruumble-project/ruumble-server/releases/latest/download/ruumble-icons.zip) from the latest release, with the SVG, PNGs in 192 and 512 px (also as maskable icons with a full-bleed background), the Apple touch icon and `favicon.ico`. Every Ruumble instance also serves them at its root, e.g. `https://<your-ruumble>/icon-512.png`. The sources are in [`web/public/`](web/public/).

### Support and contributing

- Questions, ideas, bugs and feature requests: [issues](https://github.com/ruumble-project/ruumble-server/issues).
- Security problems: please report them privately, see [SECURITY.md](SECURITY.md).
- Contributions are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

### License

[BSD-3-Clause](LICENSE). The files in `third_party/mumble/` are under Mumble's BSD-3 license (© The Mumble Developers).

The service uses Ice for JavaScript (GPL-2.0), so the distributed Docker image is GPL-2.0 as a whole (ADR-0006). This does not apply to the web UI or the plugin. Third-party components: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Ruumble is not affiliated with or endorsed by the Mumble project.
