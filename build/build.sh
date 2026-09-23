#!/bin/sh
cd "$(dirname "$0")"
{
cat <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cosmos</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}body{display:flex;align-items:center;justify-content:center}canvas{display:block}</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
(() => {
'use strict';
HTML
cat p1_shaders.js p2_engine.js p3_shots_a.js p3_shots_b.js p3_shots_c.js
cat <<'HTML'
})();
</script>
</body>
</html>
HTML
} > ../cosmos.html
