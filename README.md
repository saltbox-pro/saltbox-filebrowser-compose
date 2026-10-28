<div align = right>

&ensp;[<kbd> <br> EN <br> </kbd>](./README.md)&ensp;
&ensp;[<kbd> <br> RU <br> </kbd>](./README_RU.md)&ensp;

</div>

---

# Salt.Box FileBrowser Compose

## Table of Contents

- **[Description](#description)**
  - [Services](#services)
  - [File sources](#file-sources)
- **[How to run](#how-to-run)**
  - [Via `install_saltbox.py`](#via-install_saltboxpy)
  - [Manual setup](#manual-setup)
- **[Configuration](#configuration)**
- **[Development](#development)**
- **[License](#license)**


## Description

**Salt.Box FileBrowser Compose** is a Salt.Box addon that adds a web file
manager for Salt files to the Salt.Box UI. It is based on the third-party
[FileBrowser](https://github.com/gtsteffaniak/filebrowser) and runs on top of
[Salt.Box Compose](https://dev.saltbox.pro/saltbox/saltbox-compose/).

### Services

| Service                       | Purpose                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| `saltbox-filebrowser`         | FileBrowser itself, serves the Salt files directories                   |
| `saltbox-filebrowser-proxy`   | Nginx in front of FileBrowser, injects the `readOnly` flag of every source into the `/public/api/users` response |
| `saltbox-filebrowser-adapter` | Registers FileBrowser in the Salt.Box Gateway via discovery             |
| `saltbox-filesystem-frontend` | Salt.Box UI module of the file manager                                  |

The Gateway talks to FileBrowser through the proxy, not directly.

### File sources

| Source                | Path in container     | Host path from Salt.Box Compose          | Access     |
|-----------------------|-----------------------|------------------------------------------|------------|
| Custom Config Boxes   | `/srv/config_boxes/`  | `LOCAL_CONFIG_BOXES_PATH`                | read-write |
| Salt Custom           | `/srv/salt_custom/`   | `SALT_MASTER_STORAGE_PATH`               | read-write |
| Config Boxes          | `/srv/saltbox_salt/`  | `salt_repos` volume                      | read-only  |
| SSHFS                 | `/srv/sshfs/`         | `SSHFS_STORAGE_PATH`                     | read-only  |
| Migrator Storage      | `/srv/migrator/`      | `SSHFS_MIGRATION_PATH`                   | read-write |

- **Migrator Storage** is shown only when `FILEBROWSER_MIGRATOR_SOURCE_ENABLED`
  is set to `true`
- Sources are described in
  [`filebrowser.d/config.yaml.tmpl`](./filebrowser.d/config.yaml.tmpl)

> **NOTE:** The `readOnly` flag is a UI hint only. It is stripped from the
> config passed to FileBrowser and added by the proxy to the API response


## How to run

### Via `install_saltbox.py`

FileBrowser is a free addon and is installed by
[`install_saltbox.py`](https://dev.saltbox.pro/saltbox/saltbox-compose/-/blob/dev/bin/install_saltbox.py)
by default as part of the `FREE` set. To install it explicitly:

```bash
python3 ./install_saltbox.py --addons FileBrowser
```

### Manual setup

- Get [Salt.Box Compose](https://dev.saltbox.pro/saltbox/saltbox-compose/) to
  some outer directory and get this repository next to it
- Change directory to `saltbox-compose`
- Add to `override.env`:

```sh
_UPDATE_AND_RUN_EXTRA_ENV_FILES='../saltbox-filebrowser-compose/.env'
```

The [`.env`](./.env) file of this repository adds `compose.yaml` to
`COMPOSE_FILE` itself, so there is no need to add it to `override.env`.

- If other addons are enabled, list their `.env` files separated by commas:

```sh
_UPDATE_AND_RUN_EXTRA_ENV_FILES='../saltbox-filebrowser-compose/.env,../saltbox-metric-compose/.env'
```

- If this repository is located somewhere other than next to
  `saltbox-compose`, override `FILEBROWSER_COMPOSE_DIR` with a path relative
  to `saltbox-compose`

- Run the system with the helper script:

```bash
sudo ./bin/update_and_run.sh
```

> **ATTENTION!**
>
> The paths in `override.env` are relative to the `saltbox-compose` directory


## Configuration

Default values are set in [`.env`](./.env). Override them in `override.env`
of Salt.Box Compose, it has the highest priority.

| Variable                              | Default                       | Purpose                                                  |
|---------------------------------------|-------------------------------|----------------------------------------------------------|
| `FILEBROWSER_MIGRATOR_SOURCE_ENABLED` | `false`                       | Show the `/srv/migrator/` source with migration Salt files |
| `FILEBROWSER_IMAGE_TAG`               | `dev`                         | Tag of the FileBrowser image                             |
| `FILEBROWSER_PROXY_IMAGE_TAG`         | `dev`                         | Tag of the proxy image                                   |
| `FILEBROWSER_ADAPTER_IMAGE_TAG`       | `dev`                         | Tag of the adapter image                                 |
| `FILEBROWSER_FRONTEND_IMAGE_TAG`      | `dev`                         | Tag of the frontend image                                |
| `FILEBROWSER_COMPOSE_DIR`             | `../saltbox-filebrowser-compose` | Path to this repository                               |
| `FILEBROWSER_HOST`                    | `saltbox-filebrowser-proxy`   | Host the Gateway uses to reach FileBrowser               |
| `FILEBROWSER_PORT`                    | `80`                          | Port the Gateway uses to reach FileBrowser               |
| `FILEBROWSER_BASE_ROUTE`              | empty                         | Base route of FileBrowser                                |
| `FILEBROWSER_SERVICE_*`               |                               | Name, title, description and vendor shown in Salt.Box    |
| `FILEBROWSER_INSTANCE_ID`             |                               | ID of the service instance registered in discovery       |


## Development

Dev overrides build images from local sources instead of pulling them. Add
the needed lines to `override.env` of Salt.Box Compose:

```sh
COMPOSE_FILE="${COMPOSE_FILE}:${FILEBROWSER_COMPOSE_DIR}/compose-dev.yaml"
COMPOSE_FILE="${COMPOSE_FILE}:${FILEBROWSER_COMPOSE_DIR}/compose-adapter-dev.yaml"
```

- [`compose-dev.yaml`](./compose-dev.yaml) builds the FileBrowser and proxy
  images from this repository
- [`compose-adapter-dev.yaml`](./compose-adapter-dev.yaml) builds the adapter
  `dev` image and mounts the sources of
  [`saltbox-filebrowser-adapter`](https://dev.saltbox.pro/saltbox/saltbox-filebrowser-adapter)
  and [`saltbox-sdk`](https://dev.saltbox.pro/saltbox/saltbox-sdk) into it.
  Their locations are set by `FILEBROWSER_ADAPTER_BUILD_DIR` and `SDK_DIR`,
  `../saltbox-filebrowser-adapter` and `../saltbox-sdk/` by default

Then rebuild and run the system:

```bash
sudo ./bin/sb-compose.sh build
sudo ./bin/update_and_run.sh
```

> **ATTENTION!**
>
> Do not use dev overrides in production


## License

Salt.Box FileBrowser Compose is distributed under the **Apache License 2.0**,
see the full text in [`LICENSE.txt`](./LICENSE.txt).
