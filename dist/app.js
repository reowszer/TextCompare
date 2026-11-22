'use strict';

const get = id => document.getElementById(id);
const left = get('left');
const right = get('right');
const diff = get('diff');
const onlyChanges = get('only-changes');
const mergedDraft = get('merged-text');
const pendingFiles = new Map();
let changeGroups = [];
let selected = -1;
let merging = false;
let merge = null;

function updateMode() {
  get('start-merge').hidden = merging;
  get('exit-merge').hidden = !merging;
  get('merge-panel').hidden = !merging;
  get('swap').disabled = merging;
  get('case-option').hidden = merging;
  get('space-option').hidden = merging;
  get('results').classList.toggle('merge-results', merging);
}

function showEditor(focus = true) {
  merging = false;
  updateMode();
  get('editors').hidden = false;
  get('results').hidden = true;
  get('compare').hidden = false;
  get('edit').hidden = true;
  onlyChanges.disabled = true;
  get('navigation').hidden = true;
  get('status').textContent = 'Paste two texts to compare.';
  if (focus) left.focus();
}

function cell(line, color, segments) {
  const element = document.createElement('div');
  element.className = 'diff-cell ' + (line ? color : 'empty');
  if (!line) return element;

  const number = document.createElement('span');
  number.className = 'line-number';
  number.textContent = line.number;
  const content = document.createElement('span');
  content.className = 'line-text';
  if (segments) {
    for (const segment of segments) {
      if (segment.changed) {
        const mark = document.createElement('mark');
        mark.textContent = segment.text;
        content.append(mark);
      } else {
        content.append(segment.text);
      }
    }
  } else {
    content.textContent = line.text;
  }
  element.append(number, content);
  return element;
}

function render(focus = false) {
  const ignoreCase = !merging && get('ignore-case').checked;
  const ignoreSpace = !merging && get('ignore-space').checked;
  const details = { approximate: false };
  const rows = compareTexts(left.value, right.value, ignoreCase, ignoreSpace, details);
  const sameDrafts = merge?.left === left.value && merge?.right === right.value;
  const previous = merging && sameDrafts && !get('merge-panel').hidden ? selected : -1;
  if (merging && !sameDrafts) merge = { left: left.value, right: right.value, blocks: mergeBlocks(rows) };
  const blocks = merging ? merge.blocks : rows.map(row => ({ changed: row.type !== 'equal', rows: [row] }));
  const counts = { equal: 0, changed: 0, added: 0, removed: 0 };
  const score = similarity(rows, details);
  const elements = document.createDocumentFragment();
  changeGroups = [];
  selected = -1;
  for (const block of blocks) {
    const group = { block, elements: [] };
    for (const row of block.rows) {
      counts[row.type]++;
      if (!block.changed && onlyChanges.checked) continue;
      const element = document.createElement('div');
      element.className = 'diff-row';
      const spans = row.type === 'changed'
        ? inlineChanges(row.left.text, row.right.text, ignoreCase, ignoreSpace, details) : [];
      element.append(cell(row.left, block.changed ? 'removed' : '', spans[0]),
        cell(row.right, block.changed ? 'added' : '', spans[1]));
      if (block.choice) element.dataset.choice = block.choice;
      elements.append(element);
      group.elements.push(element);
    }
    if (block.changed) changeGroups.push(group);
  }
  diff.replaceChildren(elements);
  diff.scrollTop = 0;
  get('editors').hidden = true;
  get('results').hidden = false;
  get('compare').hidden = true;
  get('edit').hidden = false;
  onlyChanges.disabled = false;
  get('navigation').hidden = !changeGroups.length;
  get('change-position').textContent = '';
  const summary = changeGroups.length
    ? counts.changed + ' changed · ' + counts.added + ' added · ' + counts.removed + ' removed'
    : 'No differences.';
  const alignment = details.approximate ? ' · Approximate alignment' : '';
  get('status').textContent = score + ' similar · ' + summary + alignment;
  updateMode();
  if (focus) diff.focus({ preventScroll: true });
  if (merging) {
    const unresolved = changeGroups.findIndex(group => !group.block.choice);
    const initial = previous >= 0 ? previous : Math.max(0, unresolved);
    if (changeGroups.length) selectChange(initial);
    updateMergePreview();
  }
}

function selectChange(index) {
  for (const row of changeGroups[selected]?.elements ?? []) row.classList.remove('current');
  selected = index;
  const group = changeGroups[selected];
  for (const row of group.elements) row.classList.add('current');
  group.elements[0].scrollIntoView({ block: 'nearest' });
  const choice = group.block.choice;
  const decision = merging ? (choice ? ' · Kept ' + choice : ' · Choose a side') : '';
  get('change-position').textContent = 'Change ' + (selected + 1) + ' of ' + changeGroups.length + decision;
  for (const side of ['left', 'right']) {
    get('keep-' + side).setAttribute('aria-pressed', String(choice === side));
  }
}

function navigate(direction) {
  const count = changeGroups.length;
  if (!count) return;
  selectChange(selected < 0 && direction < 0 ? count - 1 : (selected + direction + count) % count);
}

function updateMergePreview() {
  const remaining = changeGroups.filter(group => !group.block.choice).length;
  mergedDraft.value = mergedText(merge.blocks);
  get('merge-progress').textContent = remaining
    ? remaining + (remaining === 1 ? ' choice' : ' choices') + ' left · Preview uses the left side until you choose'
    : 'Merged draft is ready';
  get('copy-merge').disabled = get('download-merge').disabled = remaining > 0;
  get('keep-left').disabled = get('keep-right').disabled = !changeGroups.length;
  get('merge-message').textContent = '';
  get('merge-message').hidden = true;
}

function keepSide(side) {
  const group = changeGroups[selected];
  if (!merging || !group) return;
  group.block.choice = side;
  for (const row of group.elements) row.dataset.choice = side;
  updateMergePreview();
  const next = changeGroups.findIndex((item, index) => index > selected && !item.block.choice);
  const first = next < 0 ? changeGroups.findIndex(item => !item.block.choice) : next;
  selectChange(first < 0 ? selected : first);
}

get('compare').onclick = () => render(true);
get('edit').onclick = () => showEditor();
get('start-merge').onclick = () => {
  merging = true;
  render(true);
};
get('exit-merge').onclick = () => {
  merging = false;
  render(true);
};
get('keep-left').onclick = () => keepSide('left');
get('keep-right').onclick = () => keepSide('right');
get('copy-merge').onclick = async () => {
  const message = get('merge-message');
  try {
    await navigator.clipboard.writeText(mergedDraft.value);
    message.textContent = 'Merged draft copied.';
  } catch {
    mergedDraft.focus();
    mergedDraft.select();
    message.textContent = 'Press Cmd or Ctrl + C to copy the selected draft.';
  }
  message.hidden = false;
};
get('download-merge').onclick = () => {
  const url = URL.createObjectURL(new Blob([mergedDraft.value], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'merged-draft.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
get('previous').onclick = () => navigate(-1);
get('next').onclick = () => navigate(1);
get('swap').onclick = () => {
  pendingFiles.clear();
  [left.value, right.value] = [right.value, left.value];
  if (!get('results').hidden) render();
};
get('clear').onclick = () => {
  pendingFiles.clear();
  merge = null;
  left.value = right.value = '';
  showEditor();
};
for (const option of [onlyChanges, get('ignore-case'), get('ignore-space')]) {
  option.onchange = () => {
    if (!get('results').hidden) render();
  };
}

async function loadFile(target, file) {
  if (!file) return;
  const request = Symbol();
  pendingFiles.set(target, request);
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (pendingFiles.get(target) !== request) return;
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
      : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
    const content = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    if (content.includes('\0')) throw new Error('Binary file');
    target.value = content;
    if (get('results').hidden) {
      showEditor(false);
    } else {
      render();
    }
  } catch {
    if (pendingFiles.get(target) === request) {
      get('status').textContent = 'Unable to read ' + file.name + ' as UTF-8 or UTF-16 text.';
    }
  } finally {
    if (pendingFiles.get(target) === request) pendingFiles.delete(target);
  }
}

for (const target of [left, right]) {
  target.oninput = () => pendingFiles.delete(target);
  const picker = get(target.id + '-file');
  document.querySelector('[data-open="' + target.id + '"]').onclick = () => picker.click();
  picker.onchange = () => {
    loadFile(target, picker.files[0]);
    picker.value = '';
  };
  const pane = target.closest('.editor');
  pane.ondragover = event => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    pane.classList.add('drag');
  };
  pane.ondragleave = event => {
    if (!pane.contains(event.relatedTarget)) pane.classList.remove('drag');
  };
  pane.ondrop = event => {
    pane.classList.remove('drag');
    const file = event.dataTransfer.files[0];
    if (!file) return;
    event.preventDefault();
    loadFile(target, file);
  };
}

document.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) ||
      event.ctrlKey && event.altKey && event.code === 'KeyC') {
    event.preventDefault();
    render(true);
  } else if (event.ctrlKey && event.altKey && event.code === 'KeyS') {
    event.preventDefault();
    get('swap').click();
  } else if (event.ctrlKey && event.altKey && event.code === 'KeyR') {
    event.preventDefault();
    get('clear').click();
  }
});
