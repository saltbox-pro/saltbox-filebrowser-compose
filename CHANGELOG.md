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

### Fixed

- `Config Boxes` and `SSHFS` sources are mounted read-only, the `readOnly`
  flag only hid write actions in the UI while the FileBrowser API still
  allowed writing there.
- README: `compose.yaml` is no longer added to `COMPOSE_FILE` in
  `override.env`, the `.env` file of this repository already adds it.


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
