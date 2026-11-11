const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const [archiveRoot, signedArchiveRoot] = process.argv.slice(2);
if (!archiveRoot || !signedArchiveRoot) throw new Error('Provide the shared client JMA directory and signed release JMA directory.');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
for (const name of ['catalog.js', 'pet-images.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, name), 'utf8'), context);
}
const forms = context.window.WLO_CATALOG.pets.flatMap(pet => pet.forms);
const exact = context.window.WLO_PET_IMAGES;
const required = new Set(forms.filter(form => !exact[form.id] && form.graphic).map(form => form.graphic));
const output = path.join(root, 'assets', 'pet-models');
fs.mkdirSync(output, { recursive: true });

function chunk(type, bytes) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([length, name, bytes, crc]);
}

function renderFrame(model) {
  if (model.subarray(0, 2).toString() !== 'jm') throw new Error('Invalid model header.');
  const start = model.readUInt32LE(6), count = model.readUInt32LE(10);
  if (start !== 14 + 40 * count + 1024 || model.readUInt32LE(2) + start !== model.length) throw new Error('Invalid model bounds.');
  const palette = model.subarray(14 + count * 40, start);
  let selected = null;
  for (let index = 0; index < count; index++) {
    const offset = 14 + index * 40;
    const name = model.subarray(offset + 1, offset + 1 + model[offset]).toString('ascii');
    if (!selected || name === '00-1.bmp') selected = offset;
    if (name === '12-1.bmp') { selected = offset; break; }
  }
  if (selected === null) throw new Error('Model has no frames.');
  const logicalWidth = model.readUInt16LE(selected + 12), logicalHeight = model.readUInt16LE(selected + 14);
  const left = model.readUInt16LE(selected + 16), top = model.readUInt16LE(selected + 18);
  const size = model.readUInt32LE(selected + 20), dataOffset = model.readUInt32LE(selected + 24);
  const cropWidth = model.readUInt32LE(selected + 28), cropHeight = model.readUInt32LE(selected + 32);
  const flags = model.readUInt32LE(selected + 36), stride = (cropWidth + 3) & ~3;
  if (!logicalWidth || !logicalHeight || logicalWidth > 2048 || logicalHeight > 2048 || flags !== 1 || size !== stride * cropHeight ||
      left + cropWidth > logicalWidth || top + cropHeight > logicalHeight || dataOffset + size > model.length) throw new Error('Unsupported model frame.');
  const rgb = Buffer.alloc(768), alpha = Buffer.alloc(256, 255);
  for (let i = 0; i < 256; i++) {
    const blue = palette[i * 4], green = palette[i * 4 + 1], red = palette[i * 4 + 2];
    rgb[i * 3] = red; rgb[i * 3 + 1] = green; rgb[i * 3 + 2] = blue;
    if (i === 0 || (red === 0 && green === 255 && blue === 0) || (red === 0 && green === 0 && blue === 255)) alpha[i] = 0;
  }
  let minX = cropWidth, minY = cropHeight, maxX = -1, maxY = -1;
  for (let y = 0; y < cropHeight; y++) for (let x = 0; x < cropWidth; x++) {
    if (!alpha[model[dataOffset + y * stride + x]]) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) throw new Error('Model frame is transparent.');
  const width = maxX - minX + 1, height = maxY - minY + 1;
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    model.copy(raw, y * (width + 1) + 1, dataOffset + (minY + y) * stride + minX, dataOffset + (minY + y) * stride + minX + width);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 3;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('PLTE', rgb), chunk('tRNS', alpha), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const exported = new Set();
const failures = [];
for (const [directory, name] of [[signedArchiveRoot, '001_c04.jma'], ...['001_c03.jma', '001_c02.jma', '001_c01.jma', '001.jma'].map(name => [archiveRoot, name])]) {
  const archive = path.join(directory, name);
  if (!fs.existsSync(archive)) continue;
  const file = fs.openSync(archive, 'r');
  try {
    const header = Buffer.alloc(14); fs.readSync(file, header, 0, 14, 0);
    if (header.subarray(0, 2).toString() !== 'ja') throw new Error(`Invalid archive ${name}.`);
    const size = header.readUInt32LE(2), start = header.readUInt32LE(6), count = header.readUInt32LE(10);
    if (size !== fs.fstatSync(file).size || start !== 14 + 28 * count) throw new Error(`Invalid archive index ${name}.`);
    const index = Buffer.alloc(count * 28); fs.readSync(file, index, 0, index.length, 14);
    for (let i = 0; i < count; i++) {
      const offset = i * 28, entry = index.subarray(offset + 1, offset + 1 + index[offset]).toString('ascii');
      const match = /^(\d+)\.jmp$/.exec(entry);
      if (!match) continue;
      const id = Number(match[1]);
      if (!required.has(id) || exported.has(id)) continue;
      const length = index.readUInt32LE(offset + 20), position = index.readUInt32LE(offset + 24);
      if (position < start || position + length > size) throw new Error(`Invalid ${entry} bounds.`);
      const data = Buffer.alloc(length); fs.readSync(file, data, 0, length, position);
      try { fs.writeFileSync(path.join(output, `${id}.png`), renderFrame(data)); exported.add(id); }
      catch (error) { failures.push(`${name}/${entry}: ${error.message}`); }
    }
  } finally { fs.closeSync(file); }
}
const images = {};
for (const form of forms) {
  if (!exact[form.id] && exported.has(form.graphic)) images[form.id] = `assets/pet-models/${form.graphic}.png`;
}
fs.writeFileSync(path.join(root, 'pet-models.js'), `window.WLO_PET_BASE_IMAGES = ${JSON.stringify(images)};\n`);
console.log(JSON.stringify({ exact: Object.keys(exact).length, base: Object.keys(images).length, graphics: exported.size, missing: forms.length - Object.keys(exact).length - Object.keys(images).length, failures: failures.slice(0, 8) }));
