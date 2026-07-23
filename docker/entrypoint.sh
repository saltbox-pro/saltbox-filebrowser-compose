#! /bin/sh

set -e

CONFIG_TMPL_PATH="/docker/config.yaml.tmpl"
CONFIG_OUT_PATH="/home/filebrowser/data/config.yaml"
READONLY_MAP_PATH="${READONLY_MAP_PATH:-/home/filebrowser/data/readonly.json}"

log_info() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO ] ${*}"
}

if [ "${MIGRATION_SOURCE_ENABLED}" = "true" ]; then
  log_info "Module migration is enabled. Configuring the '/srv/migrator' source"
  MIGRATOR_SOURCE_BLOCK="$(cat "${MIGRATOR_SOURCE_BLOCK_FILE}")"
else
  log_info "Module migration is disabled. Skipping '/srv/migrator' source configuration"
  MIGRATOR_SOURCE_BLOCK=""
fi
export MIGRATOR_SOURCE_BLOCK

RENDERED_CONFIG_PATH="$(mktemp)"
envsubst < "${CONFIG_TMPL_PATH}" > "${RENDERED_CONFIG_PATH}"

# The `readOnly` source flag is a UI hint served to the frontend by the proxy.
# FileBrowser rejects unknown config keys, so the flag is extracted into a map
# and stripped from the config the backend gets.
log_info "Writing the read-only sources map to '${READONLY_MAP_PATH}'"
yq -o=json -I=0 \
  '[.server.sources[] | {"key": (.name // .path), "value": (.readOnly // false)}] | from_entries' \
  "${RENDERED_CONFIG_PATH}" > "${READONLY_MAP_PATH}"

yq 'del(.server.sources[].readOnly)' "${RENDERED_CONFIG_PATH}" > "${CONFIG_OUT_PATH}"
rm -f "${RENDERED_CONFIG_PATH}"

exec filebrowser -c "${CONFIG_OUT_PATH}"
