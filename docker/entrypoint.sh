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

mkdir -p /srv/salt_custom/client-fm-uploads

RENDERED_CONFIG_PATH="$(mktemp)"
envsubst < "${CONFIG_TMPL_PATH}" > "${RENDERED_CONFIG_PATH}"

# `readOnly` and `hiddenFromUi` are UI hints served to the frontend by the proxy.
# FileBrowser rejects unknown config keys, so they are extracted into a map
# and stripped from the config the backend gets.
log_info "Writing the source flags map to '${READONLY_MAP_PATH}'"
yq -o=json -I=0 \
  '[.server.sources[] | {"key": (.name // .path), "value": {"readOnly": (.readOnly // false), "hidden": (.hiddenFromUi // false)}}] | from_entries' \
  "${RENDERED_CONFIG_PATH}" > "${READONLY_MAP_PATH}"

yq 'del(.server.sources[].readOnly) | del(.server.sources[].hiddenFromUi)' \
  "${RENDERED_CONFIG_PATH}" > "${CONFIG_OUT_PATH}"
rm -f "${RENDERED_CONFIG_PATH}"

exec filebrowser -c "${CONFIG_OUT_PATH}"
