#!/usr/bin/env node
/*
 * Design-docs viewer — zero dependencies.
 *
 * Renders every docs/*.md into one self-contained HTML page (the markdown
 * is parsed here and inlined — no server, no CDN, works offline from a
 * file:// URL) and opens it in the default browser.
 *
 *   npm run docs                 -> all docs, first one shown
 *   npm run docs multi-language  -> opens with the matching doc shown
 *
 * Hand-rolled to match the project's no-dependency ethos (see the ZIP
 * encoder and CSV parser). The markdown subset covers what our docs use:
 * headings, paragraphs, bold/italic, inline + fenced code, links, lists
 * (nested), tables, blockquotes, and horizontal rules.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'docs');
const OUT = join(tmpdir(), 'hakoniwa-docs.html');

const CODE = String.fromCharCode(0); // placeholder sentinel for code spans

/* ---- markdown -> HTML --------------------------------------------------- */

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderInline(s) {
  // Escape first, then apply inline markdown. Code spans are pulled out so
  // emphasis markers inside them are left untouched.
  const codes = [];
  let out = escapeHtml(s).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return CODE + (codes.length - 1) + CODE;
  });
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return out.replace(
    new RegExp(CODE + '(\\d+)' + CODE, 'g'),
    (_, i) => '<code>' + codes[+i] + '</code>',
  );
}

const ITEM_RE = /^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/;

// Indent-driven list parser — recurses for nested lists.
function parseList(lines, start) {
  const baseIndent = lines[start].match(ITEM_RE)[1].length;
  const ordered = /^\s*\d+\./.test(lines[start]);
  let i = start;
  let out = ordered ? '<ol>' : '<ul>';
  let cur = null;
  const close = () => {
    if (cur) out += '<li>' + renderInline(cur.text) + cur.children + '</li>';
    cur = null;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      if (lines[i + 1] && ITEM_RE.test(lines[i + 1])) { i++; continue; }
      break;
    }
    const m = line.match(ITEM_RE);
    if (!m) {
      if (cur && /^\s+/.test(line)) { cur.text += ' ' + line.trim(); i++; continue; }
      break;
    }
    const indent = m[1].length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      const sub = parseList(lines, i);
      if (cur) cur.children += sub.html;
      i = sub.next;
      continue;
    }
    close();
    cur = { text: m[2], children: '' };
    i++;
  }
  close();
  return { html: out + (ordered ? '</ol>' : '</ul>'), next: i };
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let para = [];
  let i = 0;
  const flush = () => {
    if (para.length) html.push('<p>' + para.map(renderInline).join(' ') + '</p>');
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++;
      html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      html.push('<h' + lvl + '>' + renderInline(h[2]) + '</h' + lvl + '>');
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) { flush(); html.push('<hr>'); i++; continue; }

    if (/\|/.test(line) && lines[i + 1] &&
        /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1])) {
      flush();
      const row = (r) =>
        r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const head = row(line);
      i += 2;
      let t = '<table><thead><tr>' +
        head.map((c) => '<th>' + renderInline(c) + '</th>').join('') +
        '</tr></thead><tbody>';
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
        t += '<tr>' + row(lines[i]).map((c) => '<td>' + renderInline(c) + '</td>').join('') + '</tr>';
        i++;
      }
      html.push(t + '</tbody></table>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      flush();
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      html.push('<blockquote>' + renderInline(q.join(' ')) + '</blockquote>');
      continue;
    }

    if (ITEM_RE.test(line)) {
      flush();
      const { html: listHtml, next } = parseList(lines, i);
      html.push(listHtml);
      i = next;
      continue;
    }

    if (!line.trim()) { flush(); i++; continue; }

    para.push(line.trim());
    i++;
  }
  flush();
  return html.join('\n');
}

/* ---- page assembly ------------------------------------------------------ */

const STYLE = `
:root {
  --bg:#17130f; --panel:#211b15; --text:#ece5db; --dim:#9a8f80;
  --accent:#d68b54; --accent-2:#e0a96d; --border:#34291f; --code-bg:#0f0c09;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg:#f7f3ec; --panel:#fffdf8; --text:#2a2017; --dim:#7a6f60;
    --accent:#b8602a; --accent-2:#a65420; --border:#e3d9c8; --code-bg:#f0e9dc;
  }
}
* { box-sizing:border-box; }
body {
  margin:0; display:flex; min-height:100vh; background:var(--bg); color:var(--text);
  font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}
aside {
  width:248px; flex:0 0 248px; background:var(--panel);
  border-right:1px solid var(--border); padding:22px 14px; position:sticky;
  top:0; height:100vh; overflow-y:auto;
}
.brand { display:flex; align-items:center; gap:9px; font-weight:700;
  font-size:15px; margin:0 8px 18px; letter-spacing:-0.01em; }
.brand .mark {
  width:26px; height:26px; border-radius:7px; display:grid; place-items:center;
  background:linear-gradient(135deg,var(--accent),var(--accent-2));
  color:#fff; font-size:14px;
}
nav button {
  display:block; width:100%; text-align:left; background:none; border:0;
  color:var(--dim); font:inherit; padding:8px 10px; border-radius:7px;
  cursor:pointer; margin-bottom:2px;
}
nav button:hover { background:var(--bg); color:var(--text); }
nav button.active { background:var(--bg); color:var(--accent); font-weight:600; }
main { flex:1; min-width:0; display:flex; justify-content:center; padding:46px 40px 96px; }
article { width:100%; max-width:760px; display:none; }
article.active { display:block; }
h1,h2,h3,h4 { line-height:1.3; letter-spacing:-0.015em; }
h1 { font-size:28px; margin:0 0 6px; }
h2 { font-size:20px; margin:34px 0 12px; padding-bottom:6px; border-bottom:1px solid var(--border); }
h3 { font-size:16px; margin:24px 0 8px; color:var(--accent); }
h4 { font-size:14px; margin:18px 0 6px; color:var(--dim); text-transform:uppercase; letter-spacing:0.06em; }
a { color:var(--accent); }
code { background:var(--code-bg); padding:1.5px 5px; border-radius:4px;
  font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
pre { background:var(--code-bg); border:1px solid var(--border); border-radius:9px;
  padding:14px 16px; overflow-x:auto; }
pre code { background:none; padding:0; font-size:12.5px; }
blockquote { margin:14px 0; padding:8px 16px; border-left:3px solid var(--accent);
  background:var(--panel); color:var(--dim); border-radius:0 7px 7px 0; }
hr { border:0; border-top:1px solid var(--border); margin:28px 0; }
table { border-collapse:collapse; width:100%; margin:14px 0; font-size:14px; }
th,td { border:1px solid var(--border); padding:7px 11px; text-align:left; vertical-align:top; }
th { background:var(--panel); }
ul,ol { padding-left:24px; }
li { margin:3px 0; }
li > ul, li > ol { margin:3px 0; }
`;

function build(docs, initial) {
  const nav = docs
    .map((d, n) =>
      '<button data-i="' + n + '"' + (n === initial ? ' class="active"' : '') +
      '>' + escapeHtml(d.title) + '</button>')
    .join('');
  const articles = docs
    .map((d, n) =>
      '<article data-i="' + n + '"' + (n === initial ? ' class="active"' : '') +
      '>' + d.body + '</article>')
    .join('\n');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>Hakoniwa - design docs</title><style>' + STYLE + '</style></head><body>\n' +
    '<aside><div class="brand"><span class="mark">箱</span>Design docs</div>' +
    '<nav>' + nav + '</nav></aside>\n' +
    '<main>' + articles + '</main>\n' +
    '<script>\n' +
    'const sel = (i) => {\n' +
    "  for (const el of document.querySelectorAll('[data-i]'))\n" +
    "    el.classList.toggle('active', el.dataset.i === String(i));\n" +
    "  history.replaceState(null, '', '#' + i);\n" +
    '};\n' +
    "for (const b of document.querySelectorAll('nav button'))\n" +
    '  b.onclick = () => sel(b.dataset.i);\n' +
    'if (location.hash) sel(location.hash.slice(1));\n' +
    '</script></body></html>';
}

/* ---- run ---------------------------------------------------------------- */

const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md')).sort();
if (files.length === 0) {
  console.error('No .md files in docs/');
  process.exit(1);
}

const docs = files.map((f) => {
  const md = readFileSync(join(DOCS_DIR, f), 'utf8');
  const titleMatch = md.match(/^#\s+(.+)$/m);
  return { file: f, title: titleMatch ? titleMatch[1].trim() : f, body: renderMarkdown(md) };
});

const query = (process.argv[2] || '').toLowerCase();
let initial = 0;
if (query) {
  const hit = docs.findIndex(
    (d) => d.file.toLowerCase().includes(query) || d.title.toLowerCase().includes(query),
  );
  if (hit >= 0) initial = hit;
}

writeFileSync(OUT, build(docs, initial));

const opener =
  process.platform === 'darwin' ? 'open'
  : process.platform === 'win32' ? 'start'
  : 'xdg-open';
try {
  spawn(opener, [OUT], {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  }).unref();
} catch { /* opening is best-effort */ }

console.log('Rendered ' + docs.length + ' doc(s) -> ' + OUT);
console.log('Showing: ' + docs[initial].title);
