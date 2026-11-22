'use strict';

const get = id => document.getElementById(id);
const left = get('left');
const right = get('right');
const diff = get('diff');
const onlyChanges = get('only-changes');
const pendingFiles = new Map();
let changeRows = [];
let selected = -1;

function showEditor(focus = true) {
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
  const ignoreCase = get('ignore-case').checked;
  const ignoreSpace = get('ignore-space').checked;
  const details = { approximate: false };
  const rows = compareTexts(left.value, right.value, ignoreCase, ignoreSpace, details);
  const counts = { equal: 0, changed: 0, added: 0, removed: 0 };
  const score = similarity(rows, details);
  const elements = document.createDocumentFragment();
  changeRows = [];
  selected = -1;
  for (const row of rows) {
    counts[row.type]++;
    const equal = row.type === 'equal';
    if (equal && onlyChanges.checked) continue;
    const element = document.createElement('div');
    element.className = 'diff-row';
    const spans = row.type === 'changed'
      ? inlineChanges(row.left.text, row.right.text, ignoreCase, ignoreSpace, details) : [];
    element.append(cell(row.left, equal ? '' : 'removed', spans[0]),
      cell(row.right, equal ? '' : 'added', spans[1]));
    elements.append(element);
    if (!equal) changeRows.push(element);
  }
  diff.replaceChildren(elements);
  diff.scrollTop = 0;
  get('editors').hidden = true;
  get('results').hidden = false;
  get('compare').hidden = true;
  get('edit').hidden = false;
  onlyChanges.disabled = false;
  get('navigation').hidden = !changeRows.length;
  get('change-position').textContent = '';
  get('previous').disabled = !changeRows.length;
  get('next').disabled = !changeRows.length;
  const summary = changeRows.length
    ? counts.changed + ' changed · ' + counts.added + ' added · ' + counts.removed + ' removed'
    : 'No differences.';
  const alignment = details.approximate ? ' · Approximate alignment' : '';
  get('status').textContent = score + ' similar · ' + summary + alignment;
  if (focus) diff.focus();
}

function navigate(direction) {
  if (!changeRows.length) return;
  changeRows[selected]?.classList.remove('current');
  selected = selected < 0 && direction < 0
    ? changeRows.length - 1
    : (selected + direction + changeRows.length) % changeRows.length;
  const row = changeRows[selected];
  row.classList.add('current');
  row.scrollIntoView({ block: 'nearest' });
  get('change-position').textContent = 'Change ' + (selected + 1) + ' of ' + changeRows.length;
}

get('compare').onclick = () => render(true);
get('edit').onclick = () => showEditor();
get('previous').onclick = () => navigate(-1);
get('next').onclick = () => navigate(1);
get('swap').onclick = () => {
  pendingFiles.clear();
  [left.value, right.value] = [right.value, left.value];
  if (!get('results').hidden) render();
};
get('clear').onclick = () => {
  pendingFiles.clear();
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
