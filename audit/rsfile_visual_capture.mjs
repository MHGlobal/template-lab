import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.argv[2] || 'target/source/current-v4.3.0');
const out = path.resolve(process.argv[3] || 'audit-out/web');
fs.mkdirSync(out, { recursive: true });
const pub = path.join(root, 'dynamic-ui', 'public');
const hotPath = path.join(root, 'rsapp', 'src', 'main', 'java', 'com', 'rs', 'localstorage', 'HotspotServerService.java');

const assets = [
  'rs-file-v471.js', 'rs-file-v471-hardening.js',
  'rs-file-v477-workspace.js', 'rs-file-v477-workspace.css',
  'rs-file-v478-completion.js', 'rs-file-v478-completion.css',
  'rs-file-v479-overlays.js', 'rs-file-v479-overlays.css',
  'rs-file-v4710-global-nav.js', 'rs-file-v4710-global-nav.css'
];
for (const f of [hotPath, ...assets.map(x => path.join(pub, x))]) {
  if (!fs.existsSync(f)) throw new Error(`Missing production runtime: ${f}`);
}

function javaHtml(src, method) {
  const prefix = `String ${method}(){return \"`;
  const s = src.indexOf(prefix);
  if (s < 0) throw new Error(`Missing ${method}`);
  const from = s + prefix.length;
  let esc = false, i = from;
  for (; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"' && src.slice(i, i + 3) === '";}') break;
  }
  return JSON.parse('"' + src.slice(from, i) + '"');
}

const hot = fs.readFileSync(hotPath, 'utf8');
const productionCss = ['css','v42Css','v43Css','v433Css','rsFileV47Css'].map(m => javaHtml(hot, m)).join('\n');
const productionJs = ['jsHelpers','v42Helpers','v43Helpers','v433Helpers','rsFileGestureHelpers','rsFileV47Helpers'].map(m => javaHtml(hot, m)).join('\n');
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function row(id, p, name, dir = false) {
  const href = dir ? `/admin/files?d=${encodeURIComponent(p)}` : `/admin/open?f=${encodeURIComponent(p)}`;
  return `<a id="${id}" class="file context-item" data-path="${esc(p)}" data-name="${esc(name)}" data-dir="${dir ? '1' : '0'}" data-csrf="audit" data-protected="0" data-download="${dir ? '' : `/admin/download?f=${encodeURIComponent(p)}`}" href="${href}"><span class="type">${dir ? 'DIR' : 'F'}</span><span class="fname"><b>${esc(name)}</b><small>${dir ? 'Pasta' : 'Ficheiro'}</small></span><button class="more" type="button" aria-label="Mais opções">⋮</button></a>`;
}

function html(url) {
  const u = new URL(url, 'http://local');
  const dir = u.searchParams.get('d') || '/storage/RS Storage';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${productionCss}
  <link rel="stylesheet" href="/rs-dynamic/rs-file-v477-workspace.css"><link rel="stylesheet" href="/rs-dynamic/rs-file-v478-completion.css"><link rel="stylesheet" href="/rs-dynamic/rs-file-v479-overlays.css"><link rel="stylesheet" href="/rs-dynamic/rs-file-v4710-global-nav.css">
  <style>body{margin:0;background:#090909;color:#fff;font-family:Arial,sans-serif}.admin-layout{min-height:100vh}.admin-layout main{min-width:0}.toolbar,.upload,.panel,header{padding:12px}.list{display:grid}.file{display:flex;align-items:center;gap:10px;padding:16px 12px;border-bottom:1px solid #222;color:#fff;text-decoration:none}.fname{display:grid;flex:1}.more{margin-left:auto;width:40px;height:40px}</style></head><body>
  <button class="rs-menu-fab" type="button" aria-label="Abrir menu" aria-controls="rsGlobalMenu" aria-expanded="false" onclick="rsMenuToggle()">☰</button>
  <div id="rsGlobalMenu" class="rs-global-menu" aria-hidden="true"><button class="rs-menu-backdrop" type="button" aria-label="Fechar menu" onclick="rsMenuToggle(false)"></button><div class="rs-menu-panel" role="navigation" aria-label="Navegação principal"><div class="rs-menu-brand"><b>RS Storage</b></div><a href="/admin/files">File Storage</a><a href="/cinema">RS Cinema</a><a href="/ai">RS IA</a><a href="/admin/clients">Clientes</a></div></div>
  <div class="admin-layout rs43-shell" data-rs-csrf="audit"><main><header><h1>Ficheiros</h1><p>${esc(dir)}</p></header><div class="toolbar"><a class="back" href="/admin/files?d=%2Fstorage">Voltar</a></div><section class="upload"><input id="upfiles" type="file" multiple></section><section class="panel"><div class="list">${row('folder','/storage/Projetos','Projetos',true)}${row('file','/storage/RS Storage/demo-video.mp4','demo-video.mp4')}${row('file2','/storage/RS Storage/relatorio.pdf','relatorio.pdf')}</div></section></main></div>
  ${productionJs}<script src="/rs-dynamic/rs-file-v471.js"></script><script src="/rs-dynamic/rs-file-v471-hardening.js"></script><script src="/rs-dynamic/rs-file-v477-workspace.js"></script><script src="/rs-dynamic/rs-file-v478-completion.js"></script><script src="/rs-dynamic/rs-file-v479-overlays.js"></script><script src="/rs-dynamic/rs-file-v4710-global-nav.js"></script></body></html>`;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://local');
  if (u.pathname.startsWith('/rs-dynamic/')) {
    const f = path.join(pub, path.basename(u.pathname));
    res.writeHead(200, { 'content-type': f.endsWith('.css') ? 'text/css' : 'text/javascript' });
    res.end(fs.readFileSync(f)); return;
  }
  if (u.pathname === '/api/admin/transfers') { res.writeHead(200, {'content-type':'application/json'}); res.end('{"transfers":[]}'); return; }
  if (u.pathname === '/api/admin/folders') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({current:u.searchParams.get('d') || '/storage/RS Storage', parent:'/storage', folders:[]})); return; }
  if (u.pathname === '/admin/files') { res.writeHead(200, {'content-type':'text/html'}); res.end(html(req.url)); return; }
  if (u.pathname === '/admin/open') { res.writeHead(200, {'content-type':'text/html'}); res.end('<!doctype html><title>Open</title>'); return; }
  res.writeHead(404); res.end('not found');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

async function capture(name, viewport, mobile) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const diagnostics = [];
  await page.goto(base + '/admin/files?d=%2Fstorage%2FRS%20Storage');
  await page.waitForFunction(() => window.__RS_FILE_V4710_GLOBAL_NAV__ && document.querySelector('.rs-v477-file-commandbar'));
  diagnostics.push(await page.evaluate(() => {
    const fab=document.querySelector('.rs-menu-fab'); const s=fab?getComputedStyle(fab):null;
    return {state:'files',fabExists:!!fab,fabDisplay:s?.display||null,fabVisibility:s?.visibility||null,fabOpacity:s?.opacity||null};
  }));
  await page.screenshot({ path: path.join(out, `${name}-01-files.png`), fullPage: true });

  // Drive the actual production runtime function directly. This avoids a hidden trigger
  // preventing evidence collection while still rendering the real production state.
  await page.evaluate(() => window.rsMenuToggle(true));
  await page.waitForFunction(() => document.getElementById('rsGlobalMenu')?.classList.contains('open'));
  diagnostics.push(await page.evaluate(() => ({state:'global-menu',open:document.getElementById('rsGlobalMenu')?.classList.contains('open')})));
  await page.screenshot({ path: path.join(out, `${name}-02-global-menu.png`), fullPage: true });

  await page.evaluate(() => window.rsMenuToggle(false));
  await page.evaluate(() => document.querySelector('#file .more')?.click());
  await page.waitForSelector('.context-backdrop.rs-v479-context-overlay', { state:'attached' });
  diagnostics.push(await page.evaluate(() => ({state:'context-menu',exists:!!document.querySelector('.context-backdrop.rs-v479-context-overlay')})));
  await page.screenshot({ path: path.join(out, `${name}-03-context-menu.png`), fullPage: true });

  await page.evaluate(() => window.rsOpenTransfers(true));
  await page.waitForFunction(() => document.getElementById('rsTransferModal')?.classList.contains('open'));
  diagnostics.push(await page.evaluate(() => ({state:'transfers',open:document.getElementById('rsTransferModal')?.classList.contains('open')})));
  await page.screenshot({ path: path.join(out, `${name}-04-transfers.png`), fullPage: true });
  fs.writeFileSync(path.join(out, `${name}-diagnostics.json`), JSON.stringify(diagnostics, null, 2));
  await context.close();
}

try {
  await capture('mobile-360x800', { width: 360, height: 800 }, true);
  await capture('mobile-412x915', { width: 412, height: 915 }, true);
  await capture('desktop-1366x768', { width: 1366, height: 768 }, false);
  console.log(`VISUAL_CAPTURE_DIR=${out}`);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
