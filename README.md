# Компонентное веб-программирование 2026

Учебные решения для Moodle, логин `serelllka`, ИСУ `311553`.

- `solutions/` — Callback, Promise1, Promise2, JSX (1), JSX (2).
- `labs/filesystem/` — анализ `/data` в Docker, формат `311553-FILES-DIRECTORIES-SIZE`.
- `labs/page-preview/` — веб-компонент `<page-preview>` и демонстрация.

Приложения переводчика и практик fetch:
https://serelllka-compo2026.sergey-slusarenko.chatgpt.site

Самостоятельный переводчик без сборки клиентского кода:
https://serelllka.github.io/node-server-compo2026/

`labs/fetch-server/` — переносимый сервер задания fetch на Node.js без зависимостей;
для публичного HTTPS-адреса требуется серверный хостинг.

Проверки:

```sh
node --test tests/solutions.test.cjs labs/filesystem/analyze.test.mjs
python3 -m http.server 8011 --bind 127.0.0.1
```

Браузерные проверки компонента: `http://127.0.0.1:8011/labs/page-preview/tests/browser.html`.

Опубликованный Docker-образ (анонимное скачивание и запуск проверены):
`ghcr.io/serelllka/itmo-component-lab:311553`.

Название npm-пакета до публикации: `serelllka-page-preview@1.0.0`.
