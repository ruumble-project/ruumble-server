# ADR-0025: Server and client in separate repositories

Status: proposed (2026-11-05)

## Context
Since 0.33.0 Ruumble (service, web UI, plugin) and Ruumble Desk (the Mumble 1.6 client with Ruumble built in) lived in
one repository, `KevinWebman/Ruumble-Desk`, with Desk in `desk/`. The project now has its own GitHub organization,
`ruumble-project`, and the two parts have different audiences, toolchains and release rhythms: the service is a Docker
image for operators, Desk is a Qt/C++ desktop program built against a patched Mumble.

## Decision
| Topic | Decision |
|---|---|
| **Repositories** | `ruumble-project/ruumble-server`: protocol, bridge (service), web UI, Mumble plugin, `third_party/mumble`, deployment, docs, ADRs. `ruumble-project/ruumble-client`: Ruumble Desk (the former `desk/`, now at its root). |
| **Plugin** | Stays in the server repo, next to the protocol it speaks and the image that serves it under `/download`. |
| **Coupling** | The client pins the server repo as a git submodule (`server/`) and compiles `plugin/src` and reads the icon from it. Moving the pin is a deliberate client commit. |
| **Web UI part of Desk** | `web/src/lib/desk/` and `web/src/lib/ui/desk/` stay in the server repo, because the service serves the UI. The contract is the client's `client/DeskChannel.h`; both sides stay compatible with released versions of the other. |
| **Versions and releases** | Each repo has its own version, changelog and release workflow. The server keeps its version line and tags (`v0.33.x`); the AppImage is attached to the client's releases. |
| **History** | Both repos carry the history of their own paths (split from the old repository); the old repository stays as an archive. |
| **Image** | `ghcr.io/ruumble-project/ruumble`; the Compose templates switch to it with the next release (`tools/release.sh`). |

## Rejected options
- **Plugin in the client repo.** Groups everything that runs on the user's machine, but the server image would have to download the plugin from a client release, and the plugin's hand-kept protocol validation would sit away from the zod schemas.
- **Keep one repository.** Simple, but mixes two toolchains and release rhythms and does not match the organization's layout.
- **Copy the plugin core into the client.** No submodule, but two copies of the same C++ drift apart.

## Consequences
- A change to the plugin core is made in the server and reaches Desk when the client moves its submodule.
- A change to the `desk` QWebChannel contract needs a release on both sides; older clients must keep working with newer services.
- CI of the client checks out the submodule over HTTPS; the server repo must be public (or the client CI needs a token).
