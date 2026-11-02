// dist-single/index.html → dist-single/artifact.html
// claude.ai 아티팩트는 문서 골격(doctype/html/head/body)을 자동으로 감싸므로 해당 태그를 제거한다.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-single/index.html', 'utf8');
let out = src
  .replace(/<!doctype html>/i, '')
  .replace(/<html[^>]*>|<\/html>|<head>|<\/head>|<body>|<\/body>/gi, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<link rel="icon".*?<\/svg>">/is, '');
const title = out.match(/<title>.*?<\/title>/i)?.[0] ?? '<title>도트 드림 메이커</title>';
out = title + '\n<style>:root{color-scheme:dark}html,body{height:100%;background:#12142b}</style>\n' + out.replace(title, '');
writeFileSync('dist-single/artifact.html', out);
console.log('artifact.html', (out.length / 1024).toFixed(0), 'KB');
