const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) results = results.concat(walk(fullPath));
    else if (file.endsWith('.jsx') || file.endsWith('.js')) results.push(fullPath);
  });
  return results;
}

const lucideExports = Object.keys(require('lucide-react'));
const files = walk('./src');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lucideMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  const importedLucide = new Set();
  if (lucideMatch) {
    lucideMatch[1].split(',').forEach(name => importedLucide.add(name.trim()));
  }
  
  const tagMatches = content.match(/<([A-Z][a-zA-Z0-9]+)/g) || [];
  tagMatches.forEach(tag => {
    const name = tag.slice(1);
    if (lucideExports.includes(name) && !importedLucide.has(name)) {
      const isLocallyImported = new RegExp('import\\s+.*\\b' + name + '\\b.*\\s+from').test(content) ||
                                new RegExp('(const|let|var|function)\\s+' + name + '\\b').test(content);
      if (!isLocallyImported) {
        console.log(`MISSING IMPORT in ${file}: ${name}`);
      }
    }
  });
});
