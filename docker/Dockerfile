ARG BASE_IMAGE="gtstef/filebrowser:2.0.2-stable"

FROM ${BASE_IMAGE}

USER root
RUN apk add --no-cache gettext
USER filebrowser

COPY --chmod=755 docker/entrypoint.sh /docker/entrypoint.sh
COPY --chmod=655 filebrowser.d/config.yaml.tmpl /docker/config.yaml.tmpl

ENV MIGRATOR_SOURCE_BLOCK_FILE="/docker/migrator_source_block.yaml"
COPY --chmod=644 filebrowser.d/migration_source_block.yaml "${MIGRATOR_SOURCE_BLOCK_FILE}"

EXPOSE 80
ENTRYPOINT ["/docker/entrypoint.sh"]
