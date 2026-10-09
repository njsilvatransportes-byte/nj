const fs = require('fs');
let c = fs.readFileSync('relatorio-estoque.html', 'utf8');
console.log('href index.html:', c.includes('href="index.html"'));
console.log('href dashboard.html:', c.includes('href="dashboard.html"'));
let renderMatches = c.match(/function render\(\)\{([\s\S]*?)\}/);
if (renderMatches) console.log('Render:', renderMatches[0].substring(0, 300));
