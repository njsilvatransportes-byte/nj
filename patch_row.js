const fs = require('fs');
let c = fs.readFileSync('materiais.html', 'utf8');

const regex = /\'<tr><td>\'\+x\.name\+\'<\/td><td>\'\+\(x\.description\|\|\'-\'\)\+\'<\/td><td>\'\+\(x\.unit\|\|\'-\'\)\+\'<\/td><td>\'\+\(x\.min_stock\|\|\'0\'\)\+\'<\/td><td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;" \+ \(x\.status===\'Inativo\'\?\'background:#fee2e2;color:#991b1b\':\'background:#dcfce7;color:#166534\'\) \+ ">" \+ \(x\.status\|\|\'Ativo\'\) \+ "<\/span><\/td><td><button class=\\"table-action\\" onclick="editItem\(\\'\'\+x\.id\+\'\\'\)">Editar<\/button><\/td><\/tr>\'/;

const fixedRow = '`<tr><td>${x.name}</td><td>${x.description||"-"}</td><td>${x.unit||"-"}</td><td>${x.min_stock||"0"}</td><td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;${x.status===\'Inativo\'?\'background:#fee2e2;color:#991b1b\':\'background:#dcfce7;color:#166534\'}">${x.status||\'Ativo\'}</span></td><td><button class="table-action" onclick="editItem(\\'${x.id}\\')">Editar</button></td></tr>`';

c = c.replace(regex, fixedRow);
fs.writeFileSync('materiais.html', c, 'utf8');
console.log('done');
