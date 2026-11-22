'use strict';

// Adjacent edited rows make one choice, including any extra lines on either side.
function mergeBlocks(rows) {
  const blocks = [];
  for (const row of rows) {
    const changed = row.type !== 'equal';
    const previous = blocks.at(-1);
    if (previous?.changed === changed) previous.rows.push(row);
    else blocks.push({ changed, rows: [row], choice: null });
  }
  return blocks;
}

function mergedText(blocks) {
  const lines = [];
  for (const block of blocks) {
    const side = block.choice ?? 'left';
    for (const row of block.rows) {
      if (row[side]) lines.push(row[side].text);
    }
  }
  return lines.join('\n');
}
