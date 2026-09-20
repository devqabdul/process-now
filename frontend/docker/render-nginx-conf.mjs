// Fills __INLINE_SCRIPT_HASHES__ in nginx.conf with a CSP sha256 for every inline
// <script> in the built index.html — today the theme no-flash script and
// vite-plugin-pwa's service-worker registration. Derived rather than hand-pinned:
// editing either script would otherwise break it silently in production only.
//
//   node docker/render-nginx-conf.mjs <built-index.html> <nginx.conf.in> <out>
//
// Self-check: node docker/render-nginx-conf.mjs --selftest

import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const PLACEHOLDER = '__INLINE_SCRIPT_HASHES__';
const API_PLACEHOLDER = '__API_ORIGIN__';
const INLINE_SCRIPT = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

export function inlineScriptHashes(html) {
  return [...html.matchAll(INLINE_SCRIPT)]
    .map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`)
    .join(' ');
}

// The API is a separate origin in every real deployment, so connect-src must name it or
// the browser blocks every request. Derived from the same value the bundle was built with.
export function apiOrigin(apiBaseUrl) {
  if (!apiBaseUrl) return '';
  const { origin } = new URL(apiBaseUrl);
  return origin;
}

export function render(html, conf, apiBaseUrl) {
  if (!conf.includes(PLACEHOLDER)) {
    throw new Error(`nginx.conf no longer contains ${PLACEHOLDER}; CSP would ship unfilled`);
  }
  if (!conf.includes(API_PLACEHOLDER)) {
    throw new Error(`nginx.conf no longer contains ${API_PLACEHOLDER}; the API would be blocked`);
  }
  const origin = apiOrigin(apiBaseUrl);
  return conf
    .replaceAll(PLACEHOLDER, inlineScriptHashes(html))
    .replaceAll(API_PLACEHOLDER, origin && origin !== 'null' ? ` ${origin}` : '');
}

function selftest() {
  const html = `<script src="/a.js"></script><script>x=1</script><script id="b">y=2</script>`;
  const hashes = inlineScriptHashes(html);
  assert.equal(hashes.split(' ').length, 2, 'one hash per inline script, none for src=');
  assert.ok(hashes.includes(`'sha256-${createHash('sha256').update('x=1').digest('base64')}'`));
  const conf = `script-src 'self' ${PLACEHOLDER}; connect-src 'self'${API_PLACEHOLDER};`;
  assert.equal(
    render(html, conf, 'https://api.example.com/api/v1'),
    `script-src 'self' ${hashes}; connect-src 'self' https://api.example.com;`,
  );
  assert.equal(render(html, conf, ''), `script-src 'self' ${hashes}; connect-src 'self';`);
  assert.equal(apiOrigin('http://localhost:1010/api/v1'), 'http://localhost:1010');
  assert.throws(() => render(html, "script-src 'self';", ''), /no longer contains/);
  assert.throws(
    () => render(html, `script-src 'self' ${PLACEHOLDER};`, ''),
    /the API would be blocked/,
  );
  console.log('ok');
}

if (process.argv[2] === '--selftest') {
  selftest();
} else {
  const [html, conf, out] = process.argv.slice(2);
  writeFileSync(
    out,
    render(readFileSync(html, 'utf8'), readFileSync(conf, 'utf8'), process.env.VITE_API_BASE_URL),
  );
}
