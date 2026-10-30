# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [X.X.X] - YYYY-MM-DD

### Added

- `README_RU.md` with the Russian version of the README.

### Changed

- `README.md` rewritten in the common style of Salt.Box READMEs: services,
  file sources, configuration variables and dev overrides are described.
- The `saltbox-filebrowser-proxy` nginx njs script that injected a `readOnly`
  hint into `/public/api/users` is removed, along with the `readOnly` key in
  `filebrowser.d/config.yaml.tmpl`, the `yq`-based stripping of that key in
  the FileBrowser container's `docker/entrypoint.sh`, and the
  `READONLY_MAP_PATH` variable and read-only `filebrowser_db` mount on
  `saltbox-filebrowser-proxy` in `compose.yaml`. FileBrowser's own per-scope
  permissions are unreliable under the `noauth` method this service uses, so
  the read-only hint now lives on the frontend side as a static list of
  source names.

### Fixed

- `Config Boxes` and `SSHFS` sources are mounted read-only, the `readOnly`
  flag only hid write actions in the UI while the FileBrowser API still
  allowed writing there.
- README: `compose.yaml` is no longer added to `COMPOSE_FILE` in
  `override.env`, the `.env` file of this repository already adds it.
- The `/srv/saltbox_salt/` source was named `Config Boxes` in
  `filebrowser.d/config.yaml.tmpl` instead of `Saltbox Salt`, colliding with
  the unrelated `Custom Config Boxes` source name and making the read-only
  `salt_repos` mount look like the writable config boxes source.
- `saltbox-filebrowser-proxy`'s `entrypoint.sh` called `envsubst` with a
  double-quoted pattern, which the shell expanded before `envsubst` ran, so
  the rendered nginx config never substituted `FILEBROWSER_UPSTREAM` and
  nginx failed to start.


## [0.4.0] - 2026-10-13

### Added

- `saltbox-filebrowser-proxy` service: an nginx reverse proxy in front of
  FileBrowser that injects a `readOnly` hint into every scope of the
  `/public/api/users` response, based on a new `readOnly` flag per source in
  `filebrowser.d/config.yaml.tmpl`. The Gateway and
  `saltbox-filebrowser-adapter` now talk to FileBrowser through this proxy.
  New `FILEBROWSER_PROXY_IMAGE_TAG` variable.

### Changed

### Fixed
