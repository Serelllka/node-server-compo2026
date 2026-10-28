import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function setup() {
  const handlers = {};
  const attributes = {};
  const input = { value: '', setAttribute: (key, value) => { attributes[key] = value; }, addEventListener: (name, handler) => { handlers[name] = handler; } };
  const output = { textContent: 'Перевод' };
  const status = {};
  const elements = { word: input, translation: output, status };
  const requests = [];
  class XHR {
    constructor() { requests.push(this); }
    open(method, url) { this.method = method; this.url = url; }
    send() { this.sent = true; }
    respond(data, status = 200) {
      this.status = status;
      this.responseText = typeof data === 'string' ? data : JSON.stringify(data);
      this.onload();
    }
  }
  runInNewContext(script, {
    document: { getElementById: id => elements[id] }, XMLHttpRequest: XHR,
  });
  return {
    input, output, status, requests, attributes,
    event(word, type = 'input') { input.value = word; handlers[type](); },
  };
}

test('page loads one relative dictionary and both native events perform local lookup', () => {
  assert.match(html, /<title>serelllka<\/title>/);
  assert.equal((html.match(/<input\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /https:\/\/en.openrussian.org\//);
  assert.match(html, /https:\/\/creativecommons.org\/licenses\/by-sa\/4.0\//);
  for (const event of ['input', 'change']) {
    const app = setup();
    const request = app.requests[0];
    assert.equal(app.requests.length, 1);
    assert.equal(request.method, 'GET');
    assert.equal(request.url, 'dictionary.json');
    assert.equal(request.sent, true);
    assert.equal(request.timeout, 30000);
    request.respond({ 'кошка': 'cat', 'дом': 'house' });
    app.event('  КОШКА  ', event);
    assert.equal(app.output.textContent, 'cat');
    assert.equal(app.output.lang, 'en');
    assert.equal(app.attributes['aria-invalid'], 'false');
    app.event('дом', event);
    assert.equal(app.output.textContent, 'house');
    assert.equal(app.requests.length, 1);
  }
});

test('async dictionary load translates latest input and never restores stale or cleared input', () => {
  const app = setup();
  app.event('кошка');
  assert.match(app.status.textContent, /Загружаем/);
  app.event('дом');
  app.requests[0].respond({ 'кошка': 'cat', 'дом': 'house' });
  assert.equal(app.output.textContent, 'house');
  app.event('');
  assert.equal(app.output.textContent, 'Перевод');
  assert.equal(app.output.lang, 'ru');
  assert.match(app.status.textContent, /Введите/);

  const cleared = setup();
  cleared.event('кошка');
  cleared.event('');
  cleared.requests[0].respond({ 'кошка': 'cat' });
  assert.equal(cleared.output.textContent, 'Перевод');
});

test('missing words do not leak inherited properties; NFC and English case are preserved', () => {
  const app = setup();
  app.requests[0].respond({ 'ёлка': 'fir tree', 'я': 'I', 'англия': 'England' });
  for (const word of ['неизвестно', 'constructor', '__proto__']) {
    app.event(word);
    assert.equal(app.output.textContent, 'Перевод');
    assert.equal(app.attributes['aria-invalid'], 'true');
    assert.match(app.status.textContent, /не найдено/);
  }
  app.event('Е\u0308ЛКА');
  assert.equal(app.output.textContent, 'fir tree');
  assert.equal(app.attributes['aria-invalid'], 'false');
  app.event('я');
  assert.equal(app.output.textContent, 'I');
  app.event('АНГЛИЯ');
  assert.equal(app.output.textContent, 'England');
});

test('HTTP, malformed dictionary, network and timeout failures show an actionable error', () => {
  for (const fail of [
    xhr => xhr.respond({}, 503),
    xhr => xhr.respond('{bad json'),
    xhr => xhr.respond(null),
    xhr => xhr.respond([]),
    xhr => xhr.respond({}),
    xhr => xhr.respond({ 'кошка': 7 }),
    xhr => xhr.respond({ 'кошка': ' ' }),
    xhr => xhr.onerror(),
    xhr => xhr.ontimeout(),
  ]) {
    const app = setup(); app.event('кошка'); fail(app.requests[0]);
    assert.equal(app.output.textContent, 'Перевод');
    assert.match(app.status.textContent, /Не удалось загрузить словарь/);
    app.event('дом');
    assert.match(app.status.textContent, /обновите страницу/);
    assert.equal(app.requests.length, 1);
  }
});

test('HTML-like dictionary entries are inserted as plain text', () => {
  const app = setup();
  app.requests[0].respond({ 'тег': '<img src=x onerror=alert(1)>' });
  app.event('тег');
  assert.equal(app.output.textContent, '<img src=x onerror=alert(1)>');
  assert.equal(app.output.innerHTML, undefined);
});
