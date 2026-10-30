ARG BASE_IMAGE="alpine:3.21"

FROM ${BASE_IMAGE}

RUN apk add --no-cache gettext nginx

COPY --chmod=755 docker/proxy/entrypoint.sh /docker/entrypoint.sh
COPY docker/proxy/nginx.conf.tmpl /docker/nginx.conf.tmpl
COPY docker/proxy/proxy-filebrowser.conf /etc/nginx/proxy-filebrowser.conf

EXPOSE 80
STOPSIGNAL SIGQUIT
ENTRYPOINT ["/docker/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
