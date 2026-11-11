const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const vm = require('node:vm');

const [npcFile, officialNpcFile] = process.argv.slice(2);
if (!npcFile || !officialNpcFile) throw new Error('Provide the verified Npc.Dat and decoded official NPC records.');
const siteRoot = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(siteRoot, 'catalog.js'), 'utf8'), sandbox);
const ids = new Set(sandbox.window.WLO_CATALOG.pets.flatMap(pet => pet.forms.map(form => form.id)));
const npcBytes = fs.readFileSync(npcFile);
if (npcBytes.length % 138 !== 0) throw new Error('Invalid NPC record framing.');
const records = new Map();
for (let offset = 138; offset < npcBytes.length; offset += 138) {
  const id = ((npcBytes.readUInt16LE(offset + 12) ^ 21001) - 1) & 65535;
  if (ids.has(id)) records.set(id, npcBytes.subarray(offset, offset + 138));
}

async function main() {
  const artDir = path.join(siteRoot, 'assets', 'pets');
  fs.mkdirSync(artDir, { recursive: true });
  const candidates = [];
  const lines = readline.createInterface({ input: fs.createReadStream(officialNpcFile) });
  for await (const line of lines) {
    const official = JSON.parse(line);
    const current = records.get(official.id);
    if (!current) continue;
    const original = Buffer.from(official.raw_hex, 'hex');
    if (!current.subarray(14, 34).equals(original.subarray(14, 34))) continue;
    const fields = official.numeric_fields;
    const imageName = `b${fields.u16_at_14.value}_${[18, 22, 26, 30].map(offset => fields[`u32_at_${offset}`].value).join('_')}.png`;
    const imagePath = `img/pets/${imageName}`;
    candidates.push({ id: official.id, imagePath });
  }

  const images = {};
  for (let start = 0; start < candidates.length; start += 4) {
    await Promise.all(candidates.slice(start, start + 4).map(async candidate => {
      const response = await fetch(`http://191.223.41.127/${candidate.imagePath}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) return;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return;
      fs.writeFileSync(path.join(artDir, `${candidate.id}.png`), bytes);
      images[candidate.id] = `assets/pets/${candidate.id}.png`;
    }));
  }
  fs.writeFileSync(path.join(siteRoot, 'pet-images.js'), `window.WLO_PET_IMAGES = ${JSON.stringify(images)};\n`);
  console.log(`Matched ${Object.keys(images).length} of ${ids.size} companion forms by source graphic and color.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
