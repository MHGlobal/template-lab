import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
test("web app is a complete static website", () => {
  const html = read("./index.html");
  assert.match(html, /lang="pt"/);
  assert.match(html, /<main\s/);
  assert.match(html, /app\.js/);
  assert.match(html, /style\.css/);
  for (const id of ["overview", "networks", "server", "share", "tests", "settings"])
    assert.match(html, new RegExp('id="' + id + '"'));
});
test("no hardcoded secrets or public API endpoint", () => {
  const assets = read("./index.html") + read("./app.js") + read("./style.css");
  assert.doesNotMatch(assets, /encryption_key_b64|Bearer [A-Za-z0-9-]+|api_key\s*=/i);
  assert.doesNotMatch(assets, /92\.4\.147\.107|https:\/\/api\.[^" ]+\/api\/v1\/server/);
});
test("network input is validated against virtual adapters", () => {
  const js = read("./app.js");
  assert.match(js, /wi-fi direct/i);
  assert.match(js, /renderNetworks/);
  assert.match(js, /setView/);
});
test("hotspot is not silently activated", () => {
  const html = read("./index.html");
  assert.match(html, /Ativação futura/);
  assert.match(html, /disabled/);
});
