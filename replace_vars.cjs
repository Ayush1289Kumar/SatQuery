const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');

const replacements = [
  { regex: /#10b981/g, replace: 'var(--color-primary)' },
  { regex: /16,185,129/g, replace: 'var(--primary-rgb)' },
  { regex: /#65a30d/g, replace: 'var(--color-violet)' },
  { regex: /101,163,13/g, replace: 'var(--violet-rgb)' },
  { regex: /#86efac/g, replace: 'var(--color-cyan)' },
  { regex: /134,239,172/g, replace: 'var(--cyan-rgb)' },
];

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { regex, replace } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDir(dir);
