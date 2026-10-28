# page-preview

Браузерный веб-компонент, который загружает HTML и показывает название, первый h1 и ссылку.

Пакет: `serelllka-page-preview`. Исходный код: https://github.com/Serelllka/node-server-compo2026/tree/codex/coursework/labs/page-preview.

## Подключение

После установки пакета в проекте со сборщиком:

```js
import 'serelllka-page-preview';
```

```html
<page-preview src="./pages/example.html"></page-preview>
```

Импорт автоматически регистрирует элемент. В обычном браузере без сборщика подключите `src/page-preview.js` через `<script type="module" src="./src/page-preview.js"></script>` или настройте import map.

Относительный `src` разрешается относительно baseURI страницы. Поддерживаются HTTP(S) страницы, доступные браузерному fetch; внешнему серверу требуется разрешить CORS. `file://` для демонстрации не подходит.

Открытый `shadowRoot` содержит `span[part="title"]`, `span[part="heading"]` и `a[part="link"]`. Атрибут `data-status` принимает `loading`, `ready` или `error`. Пустые значения заменяются на «Название отсутствует» и «Заголовок отсутствует». Новый `src` запускает новую загрузку; устаревшие ответы игнорируются. Удаление отменяет запрос, повторное подключение загружает страницу снова. Полученный текст не вставляется как HTML.

## Локальная проверка

Из корня пакета:

```sh
python3 -m http.server 8000
```

Откройте http://localhost:8000/demo/ и http://localhost:8000/tests/browser.html. Вторая страница проверяет состояния, ошибки, гонки, независимость экземпляров, повторное подключение и текстовую безопасность; результат виден на странице и в `window.testResult`.

```sh
node --check src/page-preview.js
npm pack --dry-run
```

Для публикации владелец аккаунта должен настроить двухфакторную аутентификацию npm. Затем выполните `npm login`, убедитесь, что `npm whoami` возвращает `serelllka`, выполните `npm publish --access public` и проверьте `npm view serelllka-page-preview@1.0.0 version`. Текущая лицензия `UNLICENSED` не предоставляет права распространения другим лицам. Только после успешной публикации отправьте в учебную систему `serelllka-page-preview@1.0.0` и ссылку https://github.com/Serelllka/node-server-compo2026.
