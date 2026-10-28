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
  const timers = new Map();
  let nextTimer = 0;
  class XHR {
    constructor() { requests.push(this); }
    open(method, url) { this.method = method; this.url = url; }
    send() { this.sent = true; }
    abort() { this.aborted = true; }
    respond(data, status = 200) {
      this.status = status;
      this.responseText = typeof data === 'string' ? data : JSON.stringify(data);
      this.onload();
    }
  }
  runInNewContext(script, {
    document: { getElementById: id => elements[id] }, TextEncoder, XMLHttpRequest: XHR,
    setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id),
  });
  return {
    input, output, status, requests, attributes,
    event(word, type = 'input') { input.value = word; handlers[type](); },
    flush() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
  };
}

test('standalone page has the required native elements and input/change events translate safely', () => {
  assert.match(html, /<title>serelllka<\/title>/);
  assert.equal((html.match(/<input\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  for (const event of ['input', 'change']) {
    const app = setup();
    app.event('  кошка  ', event);
    app.flush();
    const request = app.requests[0];
    const url = new URL(request.url);
    assert.equal(request.method, 'GET');
    assert.equal(request.sent, true);
    assert.equal(url.origin + url.pathname, 'https://api.mymemory.translated.net/get');
    assert.equal(url.searchParams.get('q'), 'кошка');
    assert.equal(url.searchParams.get('langpair'), 'ru|en');
    assert.equal(request.timeout, 12000);
    request.respond({ responseStatus: 200, responseData: { translatedText: 'cat' } });
    assert.equal(app.output.textContent, 'cat');
    assert.equal(app.output.lang, 'en');
    assert.equal(app.attributes['aria-invalid'], 'false');
    app.event('кошка', 'change');
    app.flush();
    assert.equal(app.requests.length, 1);
    assert.equal(app.output.textContent, 'cat');
  }
});

test('new input aborts prior requests and stale responses cannot overwrite output or errors', () => {
  const app = setup();
  app.event('кошка'); app.flush();
  const first = app.requests[0];
  app.event('дом'); app.flush();
  assert.equal(first.aborted, true);
  app.requests[1].respond({ responseStatus: 200, responseData: { translatedText: 'house' } });
  first.respond({ responseStatus: 200, responseData: { translatedText: 'cat' } });
  first.onerror();
  assert.equal(app.output.textContent, 'house');
  assert.equal(app.attributes['aria-invalid'], 'false');
  app.event('');
  assert.equal(app.requests[1].aborted, true);
  assert.equal(app.output.textContent, 'Перевод');
});

test('byte limit, HTTP, malformed data, quota, network and timeout failures show errors', () => {
  const oversized = setup();
  oversized.event('я'.repeat(251)); oversized.flush();
  assert.equal(oversized.requests.length, 0);
  assert.match(oversized.status.textContent, /500/);
  for (const fail of [
    xhr => xhr.respond({}, 503),
    xhr => xhr.respond('{bad json'),
    xhr => xhr.respond({ quotaFinished: true }),
    xhr => xhr.respond({ responseStatus: 403, responseData: { translatedText: 'error' } }),
    xhr => xhr.respond({ responseStatus: 200, responseData: { translatedText: ' ' } }),
    xhr => xhr.respond(null),
    xhr => xhr.onerror(),
    xhr => xhr.ontimeout(),
  ]) {
    const app = setup(); app.event('кошка'); app.flush(); fail(app.requests[0]);
    assert.equal(app.output.textContent, 'Перевод');
    assert.equal(app.attributes['aria-invalid'], 'true');
    assert.notEqual(app.status.textContent, 'Переводим…');
  }
});

test('exact curated API entry is used, and HTML-like response remains plain text', () => {
  const app = setup(); app.event('солнце'); app.flush();
  app.requests[0].respond({ responseStatus: 200, responseData: { translatedText: 'solnce' }, matches: [
    { match: 1, segment: 'другое', 'created-by': 'Wikipedia', translation: 'wrong' },
    { match: 1, segment: 'солнце', 'created-by': 'Wikipedia', translation: 'Sun' },
  ] });
  assert.equal(app.output.textContent, 'Sun');
  app.event('тег'); app.flush();
  app.requests[1].respond({ responseStatus: 200, responseData: { translatedText: '<b>text</b>' } });
  assert.equal(app.output.textContent, '<b>text</b>');
  assert.equal(app.output.innerHTML, undefined);
});
