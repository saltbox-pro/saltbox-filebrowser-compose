<div align = right>

&ensp;[<kbd> <br> EN <br> </kbd>](./README.md)&ensp;
&ensp;[<kbd> <br> RU <br> </kbd>](./README_RU.md)&ensp;

</div>

---

# Salt.Box FileBrowser Compose

## Содержание

- **[Описание](#описание)**
  - [Сервисы](#сервисы)
  - [Источники файлов](#источники-файлов)
- **[Как запустить](#как-запустить)**
  - [Через `install_saltbox.py`](#через-install_saltboxpy)
  - [Ручная настройка](#ручная-настройка)
- **[Конфигурация](#конфигурация)**
- **[Разработка](#разработка)**
- **[Лицензия](#лицензия)**


## Описание

**Salt.Box FileBrowser Compose** – аддон Salt.Box, который добавляет в
веб-интерфейс Salt.Box файловый менеджер для файлов Salt. Он построен на
стороннем [FileBrowser](https://github.com/gtsteffaniak/filebrowser) и
запускается поверх [Salt.Box Compose](https://dev.saltbox.pro/saltbox/saltbox-compose/).

### Сервисы

| Сервис                        | Назначение                                                              |
|-------------------------------|-------------------------------------------------------------------------|
| `saltbox-filebrowser`         | Сам FileBrowser, отдаёт каталоги с файлами Salt                         |
| `saltbox-filebrowser-proxy`   | Nginx перед FileBrowser, добавляет флаг `readOnly` каждого источника в ответ `/public/api/users` |
| `saltbox-filebrowser-adapter` | Регистрирует FileBrowser в Gateway Salt.Box через discovery             |
| `saltbox-filesystem-frontend` | Модуль файлового менеджера в веб-интерфейсе Salt.Box                    |

Gateway обращается к FileBrowser через прокси, а не напрямую.

### Источники файлов

| Источник              | Путь в контейнере     | Путь на хосте из Salt.Box Compose        | Доступ           |
|-----------------------|-----------------------|------------------------------------------|------------------|
| Custom Config Boxes   | `/srv/config_boxes/`  | `LOCAL_CONFIG_BOXES_PATH`                | чтение и запись  |
| Salt Custom           | `/srv/salt_custom/`   | `SALT_MASTER_STORAGE_PATH`               | чтение и запись  |
| Config Boxes          | `/srv/saltbox_salt/`  | volume `salt_repos`                      | только чтение    |
| SSHFS                 | `/srv/sshfs/`         | `SSHFS_STORAGE_PATH`                     | только чтение    |
| Migrator Storage      | `/srv/migrator/`      | `SSHFS_MIGRATION_PATH`                   | чтение и запись  |

- **Migrator Storage** отображается, только если
  `FILEBROWSER_MIGRATOR_SOURCE_ENABLED` равен `true`
- Источники описаны в
  [`filebrowser.d/config.yaml.tmpl`](./filebrowser.d/config.yaml.tmpl)

> **ПРИМЕЧАНИЕ:** Флаг `readOnly` – только подсказка для интерфейса. Он
> вырезается из конфига, который получает FileBrowser, и добавляется прокси
> в ответ API


## Как запустить

### Через `install_saltbox.py`

FileBrowser – бесплатный аддон, и
[`install_saltbox.py`](https://dev.saltbox.pro/saltbox/saltbox-compose/-/blob/dev/bin/install_saltbox.py)
устанавливает его по умолчанию в составе набора `FREE`. Чтобы установить его
явно:

```bash
python3 ./install_saltbox.py --addons FileBrowser
```

### Ручная настройка

- Склонируйте репозиторий [Salt.Box Compose](https://dev.saltbox.pro/saltbox/saltbox-compose/)
  в отдельный внешний каталог, а этот репозиторий – рядом с ним
- Перейдите в каталог `saltbox-compose`
- Добавьте в `override.env`:

```sh
_UPDATE_AND_RUN_EXTRA_ENV_FILES='../saltbox-filebrowser-compose/.env'
```

Файл [`.env`](./.env) этого репозитория сам добавляет `compose.yaml` в
`COMPOSE_FILE`, поэтому прописывать его в `override.env` не нужно.

- Если подключены другие аддоны, перечислите их `.env` файлы через запятую:

```sh
_UPDATE_AND_RUN_EXTRA_ENV_FILES='../saltbox-filebrowser-compose/.env,../saltbox-metric-compose/.env'
```

- Если этот репозиторий лежит не рядом с `saltbox-compose`, переопределите
  `FILEBROWSER_COMPOSE_DIR` путём относительно `saltbox-compose`

- Запустите систему вспомогательным скриптом:

```bash
sudo ./bin/update_and_run.sh
```

> **ВНИМАНИЕ!**
>
> Пути в `override.env` указываются относительно каталога `saltbox-compose`


## Конфигурация

Значения по умолчанию заданы в [`.env`](./.env). Переопределяйте их в
`override.env` Salt.Box Compose, у него наивысший приоритет.

| Переменная                            | По умолчанию                  | Назначение                                               |
|---------------------------------------|-------------------------------|----------------------------------------------------------|
| `FILEBROWSER_MIGRATOR_SOURCE_ENABLED` | `false`                       | Показывать источник `/srv/migrator/` с файлами Salt для миграции |
| `FILEBROWSER_IMAGE_TAG`               | `dev`                         | Тег образа FileBrowser                                   |
| `FILEBROWSER_PROXY_IMAGE_TAG`         | `dev`                         | Тег образа прокси                                        |
| `FILEBROWSER_ADAPTER_IMAGE_TAG`       | `dev`                         | Тег образа адаптера                                      |
| `FILEBROWSER_FRONTEND_IMAGE_TAG`      | `dev`                         | Тег образа фронтенда                                     |
| `FILEBROWSER_COMPOSE_DIR`             | `../saltbox-filebrowser-compose` | Путь к этому репозиторию                              |
| `FILEBROWSER_HOST`                    | `saltbox-filebrowser-proxy`   | Хост, по которому Gateway обращается к FileBrowser       |
| `FILEBROWSER_PORT`                    | `80`                          | Порт, по которому Gateway обращается к FileBrowser       |
| `FILEBROWSER_BASE_ROUTE`              | пусто                         | Базовый маршрут FileBrowser                              |
| `FILEBROWSER_SERVICE_*`               |                               | Имя, заголовок, описание и вендор сервиса в Salt.Box     |
| `FILEBROWSER_INSTANCE_ID`             |                               | ID инстанса сервиса, регистрируемого в discovery         |


## Разработка

Dev-оверрайды собирают образы из локальных исходников вместо загрузки
готовых. Добавьте нужные строки в `override.env` Salt.Box Compose:

```sh
COMPOSE_FILE="${COMPOSE_FILE}:${FILEBROWSER_COMPOSE_DIR}/compose-dev.yaml"
COMPOSE_FILE="${COMPOSE_FILE}:${FILEBROWSER_COMPOSE_DIR}/compose-adapter-dev.yaml"
```

- [`compose-dev.yaml`](./compose-dev.yaml) собирает образы FileBrowser и
  прокси из этого репозитория
- [`compose-adapter-dev.yaml`](./compose-adapter-dev.yaml) собирает
  `dev`-образ адаптера и монтирует в него исходники
  [`saltbox-filebrowser-adapter`](https://dev.saltbox.pro/saltbox/saltbox-filebrowser-adapter)
  и [`saltbox-sdk`](https://dev.saltbox.pro/saltbox/saltbox-sdk). Их
  расположение задают `FILEBROWSER_ADAPTER_BUILD_DIR` и `SDK_DIR`, по
  умолчанию `../saltbox-filebrowser-adapter` и `../saltbox-sdk/`

Затем пересоберите и запустите систему:

```bash
sudo ./bin/sb-compose.sh build
sudo ./bin/update_and_run.sh
```

> **ВНИМАНИЕ!**
>
> Не используйте dev-оверрайды в проде


## Лицензия

Salt.Box FileBrowser Compose распространяется под лицензией **Apache License
2.0** – полный текст см. в [`LICENSE.txt`](./LICENSE.txt).
