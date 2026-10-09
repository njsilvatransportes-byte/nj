const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let count = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  content = content.replace(/Movimentaes/g, 'Movimentações');
  content = content.replace(/Movimenta\uFFFD\uFFFDes/g, 'Movimentações');
  content = content.replace(/Movimenta\xEF\xBF\xBD\xEF\xBF\xBDes/g, 'Movimentações');
  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    count++;
  }
});
console.log('Fixed ' + count + ' files');
