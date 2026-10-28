# Компонентное веб-программирование 2026

Учебные решения для Moodle, логин `serelllka`, ИСУ `311553`.

- `solutions/` — Callback, Promise1, Promise2, JSX (1), JSX (2).
- `labs/filesystem/` — анализ `/data` в Docker, формат `311553-FILES-DIRECTORIES-SIZE`.
- `labs/page-preview/` — веб-компонент `<page-preview>` и демонстрация.

Практики fetch:
https://serelllka-compo2026.sergey-slusarenko.chatgpt.site/practice

Сервер задания fetch (`/login`, `/id/N`):
https://serelllka-fetch-2026.vprogamervip.workers.dev/

Переводчик с локальным словарём OpenRussian (45 646 словарных статей):
https://serelllka.github.io/node-server-compo2026/
Данные распространяются под CC BY-SA 4.0; источник, преобразования и полная
лицензия указаны в `docs/DICTIONARY-LICENSE.txt`.

`labs/fetch-server/` — переносимый сервер задания fetch на Node.js без зависимостей;
для публичного HTTPS-адреса требуется серверный хостинг.
`labs/fetch-worker/` — готовый вариант для бесплатного Cloudflare Workers.

Проверки:

```sh
node --test tests/solutions.test.cjs tests/static-translator.test.mjs labs/filesystem/analyze.test.mjs labs/fetch-server/server.test.mjs labs/fetch-worker/worker.test.mjs
python3 -m http.server 8011 --bind 127.0.0.1
```

Браузерные проверки компонента: `http://127.0.0.1:8011/labs/page-preview/tests/browser.html`.

Опубликованный Docker-образ (анонимное скачивание и запуск проверены):
`ghcr.io/serelllka/itmo-component-lab:311553`.

Подготовленный npm-пакет: `serelllka-page-preview@1.0.0`.

Статус на 28 октября 2026 года:

- Callback, Promise1, Promise2, JSX (1), JSX (2), переводчик и fetch — по 100/100 в Moodle.
- Docker — образ опубликован, ответ отправлен в форум; оценка преподавателя пока отсутствует.
- page-preview — код и архив готовы, 2FA включена; публикация в npm ожидает подтверждения ключом доступа владельца аккаунта. После публикации пакет нужно отправить в форум.
