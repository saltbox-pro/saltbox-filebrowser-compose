ARG BASE_IMAGE="gtstef/filebrowser:1.1.1-stable-slim"

FROM ${BASE_IMAGE}

RUN apk add --no-cache gettext yq

COPY --chmod=755 docker/entrypoint.sh /docker/entrypoint.sh
COPY --chmod=655 filebrowser.d/config.yaml.tmpl /docker/config.yaml.tmpl

ENV MIGRATOR_SOURCE_BLOCK_FILE="/docker/migrator_source_block.yaml"
COPY --chmod=644 filebrowser.d/migration_source_block.yaml "${MIGRATOR_SOURCE_BLOCK_FILE}"

EXPOSE 80
ENTRYPOINT ["/docker/entrypoint.sh"]
