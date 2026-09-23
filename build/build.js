const fs = require('fs');
const path = require('path');

const dir = __dirname;
const header = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cosmos</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{display:block;position:fixed;inset:0;width:100%;height:100%}</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(() => {
'use strict';
`;

const footer = `
})();
</script>
</body>
</html>
`;

const files = [
  'p1_shaders.js',
  'p2_engine.js',
  'p3_shots_a.js',
  'p3_shots_b.js',
  'p3_shots_c.js'
];

let body = '';
for (const file of files) {
  body += fs.readFileSync(path.join(dir, file), 'utf8') + '\n';
}

const outPath = path.join(dir, '..', 'cosmos.html');
fs.writeFileSync(outPath, header + body + footer, 'utf8');
console.log('Successfully built cosmos.html (' + (header.length + body.length + footer.length) + ' bytes)');
