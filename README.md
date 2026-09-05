# Salt.Box FileBrowser Compose

## How to run

- Get [Salt.Box Compose](https://dev.saltbox.pro/saltbox/saltbox-compose/) to some outer directory.
- Change directory to `saltbox-compose`.
- Add to `override.env`:

```sh
# TODO Check the relative Path to FileBrowser Compose
COMPOSE_FILE="${COMPOSE_FILE}:../saltbox-filebrowser-compose/compose.yaml"

# Optional for development
#COMPOSE_FILE="${COMPOSE_FILE}:../saltbox-filebrowser-compose/compose-adapter-dev.yaml"

# TODO Recheck the path
# Multiple values separates by commas
_UPDATE_AND_RUN_EXTRA_ENV_FILES='../saltbox-filebrowser-compose/.env'
```

- Optionally add to `override.env` new values for the [`.env`](./.env) file.

- Run the system with the helper script:

```sh
sudo ./bin/update_and_run.sh
```

## Client file manager — staging

### Download (`cp.push`)

Lands in Salt's recv-cache:

`/var/cache/salt/master/minions/<minion-id>/files/client-fm-downloads/…`

Master and Filebrowser share that tree via the `salt_master_minion_files` volume (declared in saltbox-compose). Filebrowser exposes it as the internal **Minion Recv** source (`/srv/minion_file_recv/`). The source is hidden from the File Manager UI (`hiddenFromUi`). The Filebrowser proxy allows `/api/raw` and `/api/resources` on this source only for a single `…/files/client-fm-downloads/<id>/…` path (GET/HEAD raw, DELETE resources). Extra `files`/`source`/`path`/`from`/`destination` arguments, PATCH/PUT, and search against this source are rejected.

Requires `file_recv: True` on the Salt Master.

### Upload (`cp.get_file`)

Staging stays in Salt `file_roots` so `salt://client-fm-uploads/<id>/<name>` works:

`/srv/salt_custom/client-fm-uploads/…`

Filebrowser exposes that directory as the internal **Client FM Uploads** source (`hiddenFromUi`). Salt Custom also ignores and does not index `client-fm-uploads`, so it does not appear in the visible tree. The proxy allows POST/DELETE `/api/resources` on this source only for `/<id>` or `/<id>/<name>`, and rejects Salt Custom access to `/client-fm-uploads` including PATCH `from`/`destination`. Listing, `/api/raw`, PUT, and search on the upload source are denied.

Rebuild images for **salt-master** (bridge `master.conf.tpl`), **filebrowser** (`config.yaml.tmpl`, entrypoint mkdir), and **filebrowser-proxy** (`users_readonly.js`, `client_fm_staging_guard.js`), then recreate those three services.
