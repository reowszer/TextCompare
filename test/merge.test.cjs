'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const app = vm.createContext({});
for (const script of ['diff.js', 'merge.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist', script), 'utf8'), app);
}

function blocksFor(left, right) {
  return app.mergeBlocks(app.compareTexts(left, right));
}

test('merges independent draft edits while keeping common text', () => {
  const blocks = blocksFor('Title\nOld introduction\nShared\nOld ending\n',
    'Title\nNew introduction\nShared\nNew ending\n');
  const changes = blocks.filter(block => block.changed);
  assert.equal(changes.length, 2);
  assert.equal(app.mergedText(blocks), 'Title\nOld introduction\nShared\nOld ending\n');

  changes[0].choice = 'right';
  changes[1].choice = 'left';
  assert.equal(app.mergedText(blocks), 'Title\nNew introduction\nShared\nOld ending\n');
});

test('keeps a multi-line replacement as one choice', () => {
  const blocks = blocksFor('Start\na\nb\nEnd', 'Start\nc\nEnd');
  const changes = blocks.filter(block => block.changed);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].rows.length, 2);
  changes[0].choice = 'right';
  assert.equal(app.mergedText(blocks), 'Start\nc\nEnd');
});

test('selecting one side for every change reconstructs that version', () => {
  const drafts = ['', '\n', 'one', 'one\n', 'one\n\n', '\n  \none\n', 'one\ntwo\nthree\n'];
  for (const left of drafts) {
    for (const right of drafts) {
      const blocks = blocksFor(left, right);
      for (const side of ['left', 'right']) {
        for (const block of blocks) if (block.changed) block.choice = side;
        assert.equal(app.mergedText(blocks), side === 'left' ? left : right);
      }
    }
  }
});
