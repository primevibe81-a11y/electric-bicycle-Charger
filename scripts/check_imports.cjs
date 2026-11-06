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

let errorsFound = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lucideMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  const importedLucide = new Set();
  if (lucideMatch) {
    lucideMatch[1].split(',').forEach(name => importedLucide.add(name.trim()));
  }
  
  // Check Lucide JSX tags
  const tagMatches = content.match(/<([A-Z][a-zA-Z0-9]+)/g) || [];
  tagMatches.forEach(tag => {
    const name = tag.slice(1);
    if (lucideExports.includes(name) && !importedLucide.has(name)) {
      // Check if defined as prop or local var
      const isParamOrProp = new RegExp('(?:function|const|let|var|\\b)\\s*[\\w$]*\\s*\\([^{)]*\\b' + name + '\\b').test(content) ||
                            new RegExp('(?:icon:\\s*' + name + '|\\b' + name + ':)').test(content);
      const isLocallyImported = new RegExp('import\\s+.*\\b' + name + '\\b.*\\s+from').test(content) ||
                                new RegExp('(const|let|var|function)\\s+' + name + '\\b').test(content) ||
                                isParamOrProp;
      if (!isLocallyImported) {
        console.error(`❌ MISSING LUCIDE IMPORT in ${file}: <${name} />`);
        errorsFound++;
      }
    }
  });

  // Check BATTERY_CONDITIONS references
  if (content.includes('BATTERY_CONDITIONS')) {
    const hasImport = /import\s+[\s\S]*?\bBATTERY_CONDITIONS\b[\s\S]*?\s+from/.test(content);
    const hasExport = /(export\s+(const|let|var)|const|let|var)\s+BATTERY_CONDITIONS\b/.test(content);
    if (!hasImport && !hasExport) {
      console.error(`❌ MISSING BATTERY_CONDITIONS IMPORT/DECLARATION in ${file}`);
      errorsFound++;
    }
  }
});

if (errorsFound === 0) {
  console.log('✅ All imports and identifiers verified cleanly: 0 missing imports found across all src/ files!');
  process.exit(0);
} else {
  console.error(`💥 Found ${errorsFound} import issues!`);
  process.exit(1);
}
