'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = name => readFileSync(path.join(__dirname, '../dist', name), 'utf8');

function createApp() {
  const element = (id = '') => ({
    id, value: '', textContent: '', children: [], dataset: {}, scrollTop: 0,
    classList: { add() {}, remove() {} },
    append(...children) { this.children.push(...children); },
    replaceChildren(fragment) { this.children = fragment?.children ?? []; },
    focus() {},
    setAttribute() {},
    closest() { return element(); }
  });
  const elements = new Map([...read('index.html').matchAll(/id="([^"]+)"([^>]*)/g)]
    .map(([, id, attrs]) => [id, Object.assign(element(id), { hidden: /\bhidden\b/.test(attrs) })]));
  const get = id => elements.get(id);
  const document = {
    getElementById: get, createElement: element, createDocumentFragment: element,
    querySelector: element, addEventListener() {}
  };
  const app = vm.createContext({ document, TextDecoder });
  for (const file of ['diff.js', 'merge.js', 'app.js']) vm.runInContext(read(file), app);
  return { app, get };
}

function textIn(node) {
  if (typeof node === 'string') return node;
  if (!node) return null;
  return node.textContent + node.children.map(textIn).join('');
}

function results(get) {
  return get('diff').children.map(row => row.children.map(cell => textIn(cell.children[1])));
}

test('both editors stay visible and Compare refreshes the corresponding result cells', () => {
  const { get } = createApp();
  const left = get('left');
  const right = get('right');
  left.value = 'Left version';
  right.value = 'Right version';
  get('compare').onclick();

  assert.equal(get('editors').hidden, false);
  assert.equal(get('results').hidden, false);
  assert.equal(get('compare').hidden, false);
  assert.deepEqual(results(get), [['Left version', 'Right version']]);

  left.value = 'Left edit';
  left.oninput();
  get('ignore-case').checked = true;
  get('ignore-case').onchange();
  assert.match(get('pending').textContent, /Drafts changed/);
  assert.deepEqual(results(get), [['Left version', 'Right version']]);
  get('compare').onclick();
  assert.deepEqual(results(get), [['Left edit', 'Right version']]);

  right.value = 'Right edit';
  right.oninput();
  assert.deepEqual(results(get), [['Left edit', 'Right version']]);
  get('compare').onclick();
  assert.deepEqual(results(get), [['Left edit', 'Right edit']]);
  assert.equal(get('pending').textContent, '');
  assert.equal(left.value, 'Left edit');
  assert.equal(right.value, 'Right edit');
});

test('file imports update the editor and Clear resets both results and inputs', async () => {
  const { app, get } = createApp();
  get('left').value = 'original';
  get('right').value = 'revised';
  get('compare').onclick();
  await app.loadFile(get('left'), { arrayBuffer: async () => Uint8Array.of(65).buffer });
  assert.equal(get('left').value, 'A');
  assert.deepEqual(results(get), [['original', 'revised']]);
  get('compare').onclick();
  assert.deepEqual(results(get), [['A', 'revised']]);
  get('clear').onclick();
  assert.deepEqual(results(get), []);
  assert.equal(get('left').value, '');
  assert.equal(get('right').value, '');
  assert.equal(get('results').hidden, false);
});

test('a merge refreshes against the current editors and guards export while edits are pending', () => {
  const { get } = createApp();
  get('left').value = 'first';
  get('right').value = 'second';
  get('start-merge').onclick();
  get('keep-right').onclick();
  assert.equal(get('merged-text').value, 'second');
  assert.equal(get('copy-merge').disabled, false);

  get('right').value = 'third';
  get('right').oninput();
  assert.equal(get('merged-text').value, 'second');
  assert.equal(get('download-merge').disabled, true);
  get('compare').onclick();
  get('keep-right').onclick();
  assert.equal(get('merged-text').value, 'third');
  assert.equal(get('download-merge').disabled, false);
});
