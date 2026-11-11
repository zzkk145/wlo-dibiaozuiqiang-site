const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.realpathSync(os.tmpdir());
const profile = fs.mkdtempSync(path.join(tempRoot, 'wlo-art-'));
const port = 20000 + Math.floor(Math.random() * 10000);
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore', windowsHide: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  let pages;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; }
    catch { await sleep(100); }
  }
  if (!pages) throw new Error('Browser did not start.');
  const socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  for (const name of ['lubu-portraits', 'xuanfeng-ui']) {
    const source = fs.readFileSync(path.join(root, 'assets', `${name}.png`)).toString('base64');
    const expression = `(async () => {
      const image = new Image();
      image.src = ${JSON.stringify(`data:image/png;base64,${source}`)};
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas.toDataURL('image/webp', 0.82).split(',')[1];
    })()`;
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails || !result.result.value) throw new Error(`Unable to convert ${name}.`);
    const output = Buffer.from(result.result.value, 'base64');
    fs.writeFileSync(path.join(root, 'assets', `${name}.webp`), output);
    console.log(`${name}.webp ${output.length} bytes`);
  }
  await call('Browser.close').catch(() => {});
  socket.close();
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (!browser.killed) browser.kill();
  await sleep(500);
  const resolved = fs.realpathSync(profile);
  if (path.dirname(resolved) === tempRoot && path.basename(resolved).startsWith('wlo-art-')) {
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
