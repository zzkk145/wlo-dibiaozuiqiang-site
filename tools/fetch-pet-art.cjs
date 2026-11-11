const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(siteRoot, 'catalog.js'), 'utf8'), sandbox);
const forms = sandbox.window.WLO_CATALOG.pets.flatMap(pet => pet.forms);

async function main() {
  const response = await fetch('http://191.223.41.127/api/pets', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Reference image index failed: ${response.status}`);
  const reference = await response.json();
  const referencePaths = new Set(reference.pets.flatMap(pet => pet.forms.map(form => form.img).filter(Boolean)));
  const artDir = path.join(siteRoot, 'assets', 'pets');
  fs.mkdirSync(artDir, { recursive: true });
  const images = {};
  const candidates = [];
  for (const form of forms) {
    const existing = path.join(artDir, `${form.id}.png`);
    if (fs.existsSync(existing)) { images[form.id] = `assets/pets/${form.id}.png`; continue; }
    if (!form.graphic || !Array.isArray(form.colors) || form.colors.length !== 4) continue;
    const imagePath = `img/pets/b${form.graphic}_${form.colors.join('_')}.png`;
    if (referencePaths.has(imagePath)) candidates.push({ id: form.id, imagePath });
  }
  for (let start = 0; start < candidates.length; start += 3) {
    await Promise.all(candidates.slice(start, start + 3).map(async candidate => {
      const response = await fetch(`http://191.223.41.127/${candidate.imagePath}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) return;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return;
      fs.writeFileSync(path.join(artDir, `${candidate.id}.png`), bytes);
      images[candidate.id] = `assets/pets/${candidate.id}.png`;
    }));
  }
  fs.writeFileSync(path.join(siteRoot, 'pet-images.js'), `window.WLO_PET_IMAGES = ${JSON.stringify(images)};\n`);
  console.log(`Matched ${Object.keys(images).length} of ${forms.length} companion forms by source graphic and color.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
