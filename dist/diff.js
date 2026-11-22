'use strict';

// Return aligned indices. A null index represents an insertion or deletion.
function align(left, right) {
  const rows = [];
  let start = 0;
  let endLeft = left.length;
  let endRight = right.length;
  while (start < endLeft && start < endRight && left[start] === right[start]) {
    rows.push([start, start]);
    start++;
  }
  while (endLeft > start && endRight > start && left[endLeft - 1] === right[endRight - 1]) {
    endLeft--;
    endRight--;
  }

  const height = endLeft - start;
  const width = endRight - start;
  const stride = width + 1;
  // Bound quadratic work. Large unmatched blocks still retain all their text.
  const scores = height && width && (height + 1) * stride <= 2_000_000
    ? new Uint32Array((height + 1) * stride)
    : null;
  if (scores) {
    for (let i = height - 1; i >= 0; i--) {
      for (let j = width - 1; j >= 0; j--) {
        const at = i * stride + j;
        scores[at] = left[start + i] === right[start + j]
          ? 1 + scores[at + stride + 1]
          : Math.max(scores[at + stride], scores[at + 1]);
      }
    }
  }
  let i = 0;
  let j = 0;
  while (i < height || j < width) {
    if (i < height && j < width && left[start + i] === right[start + j]) {
      rows.push([start + i++, start + j++]);
    } else if (i < height && (j === width || !scores ||
      scores[(i + 1) * stride + j] >= scores[i * stride + j + 1])) {
      rows.push([start + i++, null]);
    } else {
      rows.push([null, start + j++]);
    }
  }
  for (let offset = 0; endLeft + offset < left.length; offset++) {
    rows.push([endLeft + offset, endRight + offset]);
  }
  return rows;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const splitGraphemes = text => Array.from(graphemes.segment(text), item => item.segment);

function compareTexts(original, revised, ignoreCase, ignoreSpace) {
  const lines = text => text === '' ? [] : text.split('\n');
  const key = text => {
    const spaced = ignoreSpace ? text.trim().replace(/\s+/gu, ' ') : text;
    return ignoreCase ? spaced.toLowerCase() : spaced;
  };
  const inputs = [lines(original), lines(revised)];
  const indexed = inputs.map(side => side.map((text, index) => ({ text, number: index + 1, key: key(text) }))
    .filter(line => !(ignoreSpace && line.key === '')));
  for (const side of indexed) {
    for (const line of side.slice(0, -1)) line.hasBreak = true;
  }
  const aligned = align(indexed[0].map(line => line.key), indexed[1].map(line => line.key));
  const output = [];
  let removed = [];
  let added = [];
  function flush() {
    for (let i = 0; i < Math.max(removed.length, added.length); i++) {
      const left = removed[i];
      const right = added[i];
      output.push({ left, right, type: left && right ? 'changed' : left ? 'removed' : 'added' });
    }
    removed = [];
    added = [];
  }
  for (const [i, j] of aligned) {
    if (i === null) added.push(indexed[1][j]);
    else if (j === null) removed.push(indexed[0][i]);
    else {
      flush();
      output.push({ left: indexed[0][i], right: indexed[1][j], type: 'equal' });
    }
  }
  flush();
  return output;
}

function inlineChanges(left, right, ignoreCase = false) {
  const sides = [splitGraphemes(left), splitGraphemes(right)];
  const keys = sides.map(side => ignoreCase ? side.map(char => char.toLowerCase()) : side);
  const segments = [[], []];
  for (const pair of align(...keys)) {
    pair.forEach((index, side) => {
      if (index === null) return;
      const changed = pair[1 - side] === null;
      const last = segments[side].at(-1);
      if (last?.changed === changed) last.text += sides[side][index];
      else segments[side].push({ text: sides[side][index], changed });
    });
  }
  return segments;
}

function similarity(rows) {
  let total = 0;
  let matching = 0;
  for (const { left, right, type } of rows) {
    const before = splitGraphemes(left?.key ?? '');
    const after = type === 'equal' ? before : splitGraphemes(right?.key ?? '');
    total += before.length + after.length + Number(!!left?.hasBreak) + Number(!!right?.hasBreak);

    if (left?.hasBreak && right?.hasBreak) matching++;
    if (type === 'equal') matching += before.length;
    if (type === 'changed') {
      for (const [i, j] of align(before, after)) {
        if (i !== null && j !== null) matching++;
      }
    }
  }
  if (total === 0 || 2 * matching === total) return '100%';
  const percent = Math.round(2000 * matching / total) / 10;
  if (percent === 100) return '>99.9%';
  if (percent === 0 && matching > 0) return '<0.1%';
  return percent + '%';
}
