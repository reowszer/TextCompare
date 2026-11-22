'use strict';

const officeFormats = new Map([
  ['application/msword', 'doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
  ['application/vnd.ms-excel', 'xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
  ['application/vnd.ms-powerpoint', 'ppt'],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx']
]);
const officeFileLimit = 32 * 1024 ** 2;
const officeExpandedLimit = 128 * 1024 ** 2;

function checkOfficeArchive(bytes) {
  // Read declared expansion sizes without decompressing any ZIP entries.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  let end = bytes.length - 22;
  const earliest = Math.max(0, end - 65535);
  while (end >= earliest && (view.getUint32(end, true) !== 0x06054b50 ||
    end + 22 + view.getUint16(end + 20, true) !== bytes.length)) end--;
  if (end < earliest) throw new Error('Missing ZIP directory');

  let offset = view.getUint32(end + 16, true);
  const directoryEnd = offset + view.getUint32(end + 12, true);
  if (directoryEnd > end) throw new Error('Invalid ZIP directory');
  let expanded = 0;
  while (offset < directoryEnd) {
    if (offset + 46 > directoryEnd || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('Invalid ZIP entry');
    }
    expanded += view.getUint32(offset + 24, true);
    if (expanded > officeExpandedLimit) throw new Error('Office archive exceeds expansion limit');
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }
  if (offset !== directoryEnd) throw new Error('Invalid ZIP entry length');
}

function decodeTextFile(bytes, legacyText) {
  const utf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  let text;
  try {
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch (error) {
    if (!legacyText || encoding !== 'utf-8' || utf8Bom) throw error;
    text = new TextDecoder('windows-1252').decode(bytes);
    if (/[\x00-\x08\x0e-\x1f\x7f-\x9f]/u.test(text)) throw error;
  }
  if (text.includes('\0')) throw new Error('Binary file');
  return text;
}

async function readFileText(file) {
  const extension = file.name?.toLowerCase().split('.').at(-1);
  const format = /^(docx?|xlsx?|pptx?)$/.test(extension) ? extension : officeFormats.get(file.type);
  if (format) {
    if (file.size > officeFileLimit) throw new Error('Office files can be up to 32 MiB.');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (format.endsWith('x')) checkOfficeArchive(bytes);
      const text = officeOxide.plainText(bytes, format).replace(/\r\n?/g, '\n');
      // Legacy Word stores a required final paragraph mark.
      return format === 'doc' ? text.replace(/\n$/, '') : text;
    } catch (error) {
      if (error.message === 'Office archive exceeds expansion limit') {
        throw new Error('This Office file expands beyond the 128 MiB limit.');
      }
      throw new Error('Check that this is a valid, unlocked .' + format + ' file.');
    }
  }

  const legacyText = /^(txt|tex|md|markdown|csv|tsv|log)$/.test(extension) || file.type?.startsWith('text/');
  try {
    return decodeTextFile(new Uint8Array(await file.arrayBuffer()), legacyText);
  } catch {
    throw new Error('Choose a plain-text or supported Office file.');
  }
}
