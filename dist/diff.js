'use strict';

// Return aligned indices. A null index represents an insertion or deletion.
function align(left, right, details) {
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
  const sparse = !scores && height && width ? alignSparse(left, right, start, height, width) : null;
  if (sparse) {
    for (const row of sparse) rows.push(row);
  } else if (!scores && height && width && details) {
    details.approximate = true;
  }
  let i = sparse ? height : 0;
  let j = sparse ? width : 0;
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

// Myers' edit-distance search keeps large inputs with a few edits aligned.
function alignSparse(left, right, start, height, width) {
  const limit = Math.min(height + width, 128);
  if (Math.abs(height - width) > limit) return null;

  const offset = limit + 1;
  const trace = [];
  let previous = new Int32Array(2 * offset + 1);
  let matched = 0;
  for (let distance = 0; distance <= limit; distance++) {
    const frontier = new Int32Array(previous.length);
    for (let k = -distance; k <= distance; k += 2) {
      const fromInsertion = k === -distance ||
        (k !== distance && previous[offset + k - 1] < previous[offset + k + 1]);
      let x = fromInsertion ? previous[offset + k + 1] : previous[offset + k - 1] + 1;
      let y = x - k;
      while (x < height && y < width && left[start + x] === right[start + y]) {
        if (++matched > 2_000_000) return null;
        x++;
        y++;
      }
      frontier[offset + k] = x;
      if (x >= height && y >= width) {
        const reversed = [];
        x = height;
        y = width;
        for (let step = distance; step > 0; step--) {
          const prior = trace[step - 1];
          const diagonal = x - y;
          const insertion = diagonal === -step ||
            (diagonal !== step && prior[offset + diagonal - 1] < prior[offset + diagonal + 1]);
          const priorDiagonal = diagonal + (insertion ? 1 : -1);
          const priorX = prior[offset + priorDiagonal];
          const priorY = priorX - priorDiagonal;
          while (x > priorX && y > priorY) reversed.push([start + --x, start + --y]);
          reversed.push(insertion ? [null, start + --y] : [start + --x, null]);
        }
        while (x > 0 && y > 0) reversed.push([start + --x, start + --y]);
        return reversed.reverse();
      }
    }
    trace.push(frontier);
    previous = frontier;
  }
  return null;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const splitGraphemes = text => Array.from(graphemes.segment(text), item => item.segment);

function lineKey(text, ignoreCase, ignoreSpace) {
  const spaced = ignoreSpace ? text.trim().replace(/\s+/gu, ' ') : text;
  return ignoreCase ? spaced.toLowerCase() : spaced;
}

function compareTexts(original, revised, ignoreCase, ignoreSpace, details) {
  const lines = text => text === '' ? [] : text.split('\n');
  const inputs = [lines(original), lines(revised)];
  const indexed = inputs.map(side => side.map((text, index) => ({
    text, number: index + 1, key: lineKey(text, ignoreCase, ignoreSpace)
  }))
    .filter(line => !(ignoreSpace && line.key === '')));
  for (const side of indexed) {
    for (const line of side.slice(0, -1)) line.hasBreak = true;
  }
  const aligned = align(indexed[0].map(line => line.key), indexed[1].map(line => line.key), details);
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

function inlineChanges(left, right, ignoreCase = false, ignoreSpace = false, details) {
  const partsFor = text => {
    const chunks = ignoreSpace ? text.split(/(\s+)/u) : [text];
    const normalized = lineKey(text, ignoreCase, ignoreSpace);
    let offset = 0;
    return chunks.flatMap((chunk, index) => {
      if (index % 2 === 1) {
        const key = chunks[index - 1] && chunks[index + 1] ? ' ' : '';
        offset += key.length;
        return [{ text: chunk, key, changed: false }];
      }
      return splitGraphemes(chunk).map(char => {
        const end = offset + (ignoreCase ? char.toLowerCase().length : char.length);
        const key = normalized.slice(offset, end);
        offset = end;
        return { text: char, key, changed: false };
      });
    });
  };
  const sides = [partsFor(left), partsFor(right)];
  const comparable = sides.map(parts => parts.filter(part => part.key !== ''));
  for (const [i, j] of align(comparable[0].map(part => part.key), comparable[1].map(part => part.key), details)) {
    if (j === null) comparable[0][i].changed = true;
    if (i === null) comparable[1][j].changed = true;
  }
  return sides.map(parts => {
    const segments = [];
    for (const { text, changed } of parts) {
      const last = segments.at(-1);
      if (last?.changed === changed) last.text += text;
      else segments.push({ text, changed });
    }
    return segments;
  });
}

function similarity(rows, details) {
  let total = 0;
  let matching = 0;
  for (const { left, right, type } of rows) {
    const before = splitGraphemes(left?.key ?? '');
    const after = type === 'equal' ? before : splitGraphemes(right?.key ?? '');
    total += before.length + after.length + Number(!!left?.hasBreak) + Number(!!right?.hasBreak);

    if (left?.hasBreak && right?.hasBreak) matching++;
    if (type === 'equal') matching += before.length;
    if (type === 'changed') {
      for (const [i, j] of align(before, after, details)) {
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
