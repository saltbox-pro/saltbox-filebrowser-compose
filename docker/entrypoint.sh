#! /bin/sh

set -e

CONFIG_TMPL_PATH="/docker/config.yaml.tmpl"
CONFIG_OUT_PATH="/home/filebrowser/data/config.yaml"

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

envsubst < "${CONFIG_TMPL_PATH}" > "${CONFIG_OUT_PATH}"
exec filebrowser -c "${CONFIG_OUT_PATH}"
