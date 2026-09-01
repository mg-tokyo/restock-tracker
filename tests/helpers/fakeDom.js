// Minimal DOM stand-in for structural tests of ui/rows.js. Not a browser.
class FakeEl {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attrs = {};
    this._cls = new Set(); this._text = ''; this.title = ''; this.style = {}; this.listeners = {};
    this.hidden = false; this.src = ''; this.alt = ''; this.type = '';
  }
  get textContent() {
    if (!this.children.length) return this._text;
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) { this._text = String(v ?? ''); this.children = []; }
  get classList() {
    const s = this._cls;
    return { add: (...c) => c.forEach((x) => s.add(x)), remove: (...c) => c.forEach((x) => s.delete(x)),
      toggle: (c, f) => { (f ?? !s.has(c)) ? s.add(c) : s.delete(c); }, contains: (c) => s.has(c) };
  }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this._cls].join(' '); }
  append(...nodes) { for (const n of nodes) if (n) this.children.push(n); }
  appendChild(n) { this.children.push(n); return n; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, fn) { (this.listeners[t] ??= []).push(fn); }
  click() { for (const fn of this.listeners.click ?? []) fn({ stopPropagation() {}, target: this }); }
  querySelectorAll(sel) { // supports ".cls" only
    const cls = sel.replace(/^\./, ''); const out = [];
    const walk = (n) => { for (const c of n.children) { if (c._cls.has(cls)) out.push(c); walk(c); } };
    walk(this); return out;
  }
  find(cls) { return this.querySelectorAll(`.${cls}`)[0] ?? null; }
}
export function installFakeDom() {
  globalThis.document = { createElement: (t) => new FakeEl(t), hidden: false };
  return FakeEl;
}
