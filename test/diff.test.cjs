'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const engine = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/diff.js'), 'utf8'), engine);

function highlighted(parts) {
  return parts.filter(part => part.changed).map(part => part.text).join('');
}

test('preserves a large unchanged block between line edits', () => {
  const shared = Array.from({ length: 1500 }, (_, i) => 'line ' + i).join('\n');
  const details = { approximate: false };
  const rows = engine.compareTexts('old\n' + shared + '\nold', 'new\n' + shared + '\nnew',
    false, false, details);

  assert.equal(rows.length, 1502);
  assert.equal(rows.filter(row => row.type === 'equal').length, 1500);
  assert.equal(rows[0].type, 'changed');
  assert.equal(rows.at(-1).type, 'changed');
  assert.equal(details.approximate, false);
});

test('preserves matching characters inside a long edited line', () => {
  const shared = 'a'.repeat(1500);
  const original = 'X' + shared + 'Y';
  const revised = 'P' + shared + 'Q';
  const [left, right] = engine.inlineChanges(original, revised);

  assert.equal(highlighted(left), 'XY');
  assert.equal(highlighted(right), 'PQ');
  assert.equal(engine.similarity(engine.compareTexts(original, revised)), '99.9%');
});

test('honors ignore options in inline highlights and preserves the original spacing', () => {
  const original = '  ΟΣ  bX ';
  const revised = 'ος\tbY';
  const [left, right] = engine.inlineChanges(original, revised, true, true);

  assert.equal(highlighted(left), 'X');
  assert.equal(highlighted(right), 'Y');
  assert.equal(left.map(part => part.text).join(''), original);
  assert.equal(right.map(part => part.text).join(''), revised);
});

test('reports when alignment uses the bounded fallback', () => {
  const details = { approximate: false };
  engine.inlineChanges('x'.repeat(1500), 'y'.repeat(1500), false, false, details);

  assert.equal(details.approximate, true);
});
