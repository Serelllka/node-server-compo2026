const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: block; margin: 1rem 0; font: 16px/1.5 system-ui, sans-serif; }
    article { padding: 1rem; border: 1px solid #aab4c0; border-radius: .5rem; }
    span, a { display: block; overflow-wrap: anywhere; }
    [part="title"] { font-weight: bold; }
    a { color: #0645ad; }
  </style>
  <article aria-live="polite">
    <span part="title"></span>
    <span part="heading"></span>
    <a part="link"></a>
    <span part="message"></span>
  </article>`;

export class PagePreview extends HTMLElement {
  static observedAttributes = ['src'];
  #controller;
  #source;
  #generation = 0;
  #title;
  #heading;
  #link;
  #message;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.append(template.content.cloneNode(true));
    this.#title = root.querySelector('[part="title"]');
    this.#heading = root.querySelector('[part="heading"]');
    this.#link = root.querySelector('[part="link"]');
    this.#message = root.querySelector('[part="message"]');
  }

  connectedCallback() { this.#load(); }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#generation++;
    this.#source = undefined;
  }

  attributeChangedCallback(name, previous, current) {
    if (previous !== current && this.isConnected) this.#load();
  }

  async #load() {
    const source = this.getAttribute('src');
    if (source === this.#source) return;
    this.#source = source;
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    const generation = ++this.#generation;
    const isCurrent = () => this.isConnected && generation === this.#generation;
    this.dataset.status = 'loading';
    this.#title.textContent = '';
    this.#heading.textContent = '';
    this.#link.removeAttribute('href');
    this.#link.textContent = '';
    this.#message.textContent = 'Загрузка…';
    try {
      if (!source?.trim()) throw new Error('Не указан src');
      const url = new URL(source, this.ownerDocument.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Ожидается HTTP(S) URL');
      this.#link.href = url.href;
      this.#link.textContent = url.href;
      const response = await fetch(url.href, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (!isCurrent()) return;
      const page = new DOMParser().parseFromString(html, 'text/html');
      const title = page.title.trim();
      const heading = page.querySelector('h1')?.textContent.trim();
      this.#title.textContent = title || 'Название отсутствует';
      this.#heading.textContent = heading || 'Заголовок отсутствует';
      this.#link.textContent = title || url.href;
      this.#message.textContent = '';
      this.dataset.status = 'ready';
    } catch (error) {
      if (!isCurrent()) return;
      this.#message.textContent = `Не удалось загрузить страницу: ${error.message}`;
      this.dataset.status = 'error';
    }
  }
}

customElements.define('page-preview', PagePreview);
