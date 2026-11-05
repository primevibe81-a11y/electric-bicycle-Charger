/**
 * Automated test suite for Active View Integrity & Error Boundary Protection
 * 
 * Tests:
 * 1. AktifView.jsx properly imports useMemo from 'react'
 * 2. Static scan across all .jsx files in src/ to ensure zero missing React hook imports
 * 3. ErrorBoundary.jsx component existence and structure (componentDidCatch, fallback UI, reset/reload buttons)
 * 4. App.jsx imports ErrorBoundary and wraps tab views with ErrorBoundary key={activeTab}
 * 5. AktifView displayLimit and useMemo slice logic for 60fps WebKit iOS rendering
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Automated Tests: Active View Integrity & Error Boundary Protection...\n');

let passCount = 0;
let failCount = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

const rootDir = path.resolve(__dirname, '..');

// Helper to recursively find all .jsx files
function getJsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getJsxFiles(fullPath));
    } else if (file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

// 1. AktifView.jsx imports useMemo
it('1. AktifView.jsx mengimpor useMemo dari react', () => {
  const aktifViewPath = path.join(rootDir, 'src/views/AktifView.jsx');
  assert(fs.existsSync(aktifViewPath), 'File AktifView.jsx harus ada');
  const content = fs.readFileSync(aktifViewPath, 'utf8');
  
  const reactImportMatch = content.match(/import\s+(?:React\s*,?\s*)?\{([^}]+)\}\s+from\s+['"]react['"]/);
  assert(reactImportMatch, 'Harus ada import { ... } from "react" di AktifView.jsx');
  const importedHooks = reactImportMatch[1].split(',').map(s => s.trim());
  assert(importedHooks.includes('useMemo'), 'useMemo harus terdaftar di import dari react');
});

// 2. Scan all JSX files for undeclared hooks
it('2. Seluruh file .jsx di folder src tidak memiliki hooks yang luput diimpor', () => {
  const srcDir = path.join(rootDir, 'src');
  const jsxFiles = getJsxFiles(srcDir);
  const commonHooks = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useLayoutEffect', 'useContext', 'useReducer'];
  
  const missingHookErrors = [];

  jsxFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
    
    // Find hooks imported from 'react'
    const importedHooks = new Set();
    const importRegex = /import\s+(?:React\s*,?\s*)?\{([^}]+)\}\s+from\s+['"]react['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      match[1].split(',').map(s => s.trim().replace(/\s+as\s+.*/, '')).forEach(h => importedHooks.add(h));
    }

    // Also check default React import like `import React from 'react'`
    const hasDefaultReact = /import\s+React(?:\s*,|\s+from)/.test(content);

    commonHooks.forEach(hook => {
      // Check if hook is used as a standalone identifier: hook(
      const usageRegex = new RegExp(`(?<![a-zA-Z0-9_.])(${hook})\\s*\\(`, 'g');
      if (usageRegex.test(content)) {
        if (!importedHooks.has(hook)) {
          // If not directly imported, verify if it was used as React.hook( (which wouldn't match usageRegex without dot)
          missingHookErrors.push(`${relativePath}: hook '${hook}' digunakan tetapi tidak diimpor dari 'react'`);
        }
      }
    });
  });

  if (missingHookErrors.length > 0) {
    throw new Error(`Ditemukan missing hooks:\n${missingHookErrors.join('\n')}`);
  }
});

// 3. ErrorBoundary component verification
it('3. ErrorBoundary.jsx dibuat dengan fallback UI, componentDidCatch, dan tombol pemulihan', () => {
  const ebPath = path.join(rootDir, 'src/components/ErrorBoundary.jsx');
  assert(fs.existsSync(ebPath), 'src/components/ErrorBoundary.jsx harus ada');
  const content = fs.readFileSync(ebPath, 'utf8');

  assert(content.includes('componentDidCatch'), 'Harus mengimplementasikan componentDidCatch');
  assert(content.includes('getDerivedStateFromError'), 'Harus mengimplementasikan getDerivedStateFromError');
  assert(content.includes('Terjadi Kendala pada Halaman'), 'Harus menampilkan judul ramah pengguna saat error');
  assert(content.includes('Kembali ke Dashboard'), 'Harus ada tombol Kembali ke Dashboard');
  assert(content.includes('Muat Ulang Aplikasi'), 'Harus ada tombol Muat Ulang Aplikasi');
  assert(content.includes('handleReset'), 'Harus memiliki handler reset state');
});

// 4. App.jsx wraps view area with ErrorBoundary
it('4. App.jsx mengimpor ErrorBoundary dan membungkus view container', () => {
  const appPath = path.join(rootDir, 'src/App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');

  assert(content.includes("import ErrorBoundary from './components/ErrorBoundary';"), 'App.jsx harus mengimpor ErrorBoundary');
  assert(content.includes('<ErrorBoundary'), 'App.jsx harus merender <ErrorBoundary>');
  assert(content.includes('key={activeTab}'), 'ErrorBoundary harus memiliki key={activeTab} untuk reset state saat pindah tab');
  assert(content.includes("onReset={() => setActiveTab('dashboard')}"), 'ErrorBoundary harus menyediakan handler onReset ke dashboard');
});

// 5. displayedUnits pagination in AktifView.jsx
it('5. AktifView.jsx mengoptimalkan performa WebKit iOS dengan useMemo slice untuk displayedUnits', () => {
  const aktifViewPath = path.join(rootDir, 'src/views/AktifView.jsx');
  const content = fs.readFileSync(aktifViewPath, 'utf8');

  assert(content.includes('useMemo(() => {'), 'Harus ada useMemo untuk pagination/slice');
  assert(content.includes('processedUnits.slice(0, displayLimit)'), 'Harus membatasi render awal dengan slice displayLimit');
  assert(content.includes('displayLimit'), 'Harus melacak displayLimit');
});

console.log(`\nResults: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Active View & Error Boundary tests passed successfully!\n');
}
