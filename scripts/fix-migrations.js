const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../lib/db/migrations/tenant');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.sql')) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/"public"\./g, '');
    fs.writeFileSync(p, content);
    console.log(`Patched ${file}`);
  }
});
