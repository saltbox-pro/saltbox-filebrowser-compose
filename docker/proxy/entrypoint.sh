#! /bin/sh

set -e

CONFIG_TMPL_PATH="/docker/nginx.conf.tmpl"
CONFIG_OUT_PATH="/etc/nginx/nginx.conf"

log_info() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO ] ${*}"
}

FILEBROWSER_UPSTREAM="${FILEBROWSER_UPSTREAM:-saltbox-filebrowser:80}"
export FILEBROWSER_UPSTREAM

log_info "Proxying FileBrowser at '${FILEBROWSER_UPSTREAM}'"
envsubst '${FILEBROWSER_UPSTREAM}' < "${CONFIG_TMPL_PATH}" > "${CONFIG_OUT_PATH}"

exec "${@}"
