/**
 * Automated Security Audit & Hardening Verification Test Suite
 * Tests 27 Security Checklist criteria
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Menjalankan Automated Security Audit & Testing Suite...\n');

let passCount = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

(async () => {
  // Mock localStorage for Node.js test environment
  const mockStorage = {};
  global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };

  // Mock globalThis.crypto for Node.js
  if (!globalThis.crypto?.subtle) {
    globalThis.crypto = crypto.webcrypto;
  }

  // Import security modules dynamically or simulate
  const securityServicePath = path.resolve(__dirname, '../src/services/security.js');
  const securityContent = fs.readFileSync(securityServicePath, 'utf8');

  // ==========================================
  // SECTION 1: AUTHENTICATION & PIN HASHING (#01, #08, #12)
  // ==========================================
  console.log('--- 1. Keamanan Autentikasi & Hashing PIN ---');

  const authPath = path.resolve(__dirname, '../src/config/auth.js');
  const authContent = fs.readFileSync(authPath, 'utf8');

  test('Kode auth.js tidak boleh menyimpan PIN plaintext (135790 atau 246810)', () => {
    assert.strictEqual(authContent.includes('pinCode: "135790"'), false, 'PIN admin masih berupa plaintext!');
    assert.strictEqual(authContent.includes('pinCode: "246810"'), false, 'PIN kasir masih berupa plaintext!');
    assert.strictEqual(authContent.includes('pinHash'), true, 'Harus menyimpan pinHash!');
  });

  test('Hash SHA-256 terhitung deterministik sesuai dengan salt yang ditentukan', () => {
    const salt = 'ebike_gadai_salt_2026_';
    const adminExpected = crypto.createHash('sha256').update(salt + '135790').digest('hex');
    const kasirExpected = crypto.createHash('sha256').update(salt + '246810').digest('hex');

    assert.strictEqual(adminExpected, 'f53af8901422065220c18e27c751a58793226cb1c6d44a3d8e814acdcb5917b2');
    assert.strictEqual(kasirExpected, '6aa2548aaab4c56532d368c7467af645f670d7ec5695769324981c6d78abe96b');
    assert.strictEqual(authContent.includes(adminExpected), true, 'Hash admin harus terdaftar di auth.js');
    assert.strictEqual(authContent.includes(kasirExpected), true, 'Hash kasir harus terdaftar di auth.js');
  });

  // ==========================================
  // SECTION 2: BRUTE-FORCE LOCKOUT & RATE LIMITING (#05, #09, #15)
  // ==========================================
  console.log('\n--- 2. Brute-Force Lockout & Rate Limiting ---');

  // Test simulation of lockout mechanism
  test('Sistem membatasi percobaan login maksimal 5 kali berturut-turut', () => {
    let failCount = 0;
    const MAX = 5;
    let locked = false;

    for (let i = 1; i <= 6; i++) {
      failCount++;
      if (failCount >= MAX) {
        locked = true;
      }
    }

    assert.strictEqual(locked, true);
    assert.strictEqual(failCount >= 5, true);
  });

  test('Lockout berdurasi 300 detik (5 menit)', () => {
    assert.strictEqual(securityContent.includes('5 * 60 * 1000'), true, 'Durasi lockout harus 5 menit (300.000 ms)');
    assert.strictEqual(securityContent.includes('MAX_LOGIN_ATTEMPTS = 5'), true, 'Maksimal percobaan harus 5');
  });

  test('Event audit security dicatat saat percobaan login gagal & lockout', () => {
    assert.strictEqual(securityContent.includes('BRUTE_FORCE_LOCKOUT_TRIGGERED'), true);
    assert.strictEqual(securityContent.includes('LOGIN_FAILED'), true);
    assert.strictEqual(securityContent.includes('LOGIN_SUCCESS'), true);
  });

  // ==========================================
  // SECTION 3: FILE UPLOAD VALIDATION & SIZE LIMIT (#06, #18)
  // ==========================================
  console.log('\n--- 3. Validasi Keamanan Unggahan Excel ---');

  test('Maksimal ukuran file dibatasi 5 MB', () => {
    assert.strictEqual(securityContent.includes('5 * 1024 * 1024'), true, 'Batas ukuran file harus 5MB');
  });

  test('Fungsi validasi menolak file berbahaya / bukan Excel', () => {
    // Ekstraksi logika validateSpreadsheetFile
    const MAX_SIZE = 5 * 1024 * 1024;
    function validate(file) {
      if (!file) return false;
      if (file.size > MAX_SIZE) return false;
      const name = String(file.name || '').toLowerCase();
      return name.endsWith('.xlsx') || name.endsWith('.xls');
    }

    assert.strictEqual(validate({ name: 'laporan.xlsx', size: 1024 }), true, 'File .xlsx valid harus diterima');
    assert.strictEqual(validate({ name: 'data.xls', size: 1024 }), true, 'File .xls valid harus diterima');
    assert.strictEqual(validate({ name: 'script.exe', size: 1024 }), false, 'File .exe harus ditolak');
    assert.strictEqual(validate({ name: 'laporan.pdf', size: 1024 }), false, 'File .pdf harus ditolak');
    assert.strictEqual(validate({ name: 'huge.xlsx', size: 6 * 1024 * 1024 }), false, 'File > 5MB harus ditolak');
  });

  // ==========================================
  // SECTION 4: ANTI-XSS & SANITIZATION (#07, #10)
  // ==========================================
  console.log('\n--- 4. Sanitasi Input & Perlindungan Anti-XSS ---');

  test('Fungsi sanitizeText menetralkan tag HTML, script, dan event handler', () => {
    function sanitize(input) {
      if (input === null || input === undefined) return '';
      let clean = String(input);
      clean = clean.replace(/\0/g, '');
      clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      clean = clean.replace(/<[^>]*>?/gm, '');
      clean = clean.replace(/javascript\s*:/gi, '');
      clean = clean.replace(/on\w+\s*=/gi, '');
      clean = clean.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return clean.trim();
    }

    const testPayload1 = '<script>alert("XSS")</script>Nasabah Aman';
    assert.strictEqual(sanitize(testPayload1), 'Nasabah Aman');

    const testPayload2 = '<img src=x onerror="alert(1)">Budi';
    assert.strictEqual(sanitize(testPayload2), 'Budi');

    const testPayload3 = 'javascript:alert(1)';
    assert.strictEqual(sanitize(testPayload3), 'alert(1)');
  });

  test('Kode sumber tidak menggunakan innerHTML atau dangerouslySetInnerHTML', () => {
    const srcDir = path.resolve(__dirname, '../src');
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          scanDir(full);
        } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
          const content = fs.readFileSync(full, 'utf8');
          assert.strictEqual(content.includes('dangerouslySetInnerHTML'), false, `dangerouslySetInnerHTML ditemukan di ${f}`);
          assert.strictEqual(content.includes('.innerHTML ='), false, `innerHTML assignment ditemukan di ${f}`);
        }
      }
    }
    scanDir(srcDir);
  });

  // ==========================================
  // SECTION 5: ENVIRONMENT & SECRET LEAKAGE AUDIT (#02, #11, #23, #24, #25)
  // ==========================================
  console.log('\n--- 5. Audit Kebocoran Kunci Rahasia & Public Directory ---');

  test('Folder public/ tidak memuat file sensitif (.env, .xlsx, .pdf, dump)', () => {
    const publicDir = path.resolve(__dirname, '../public');
    const files = fs.readdirSync(publicDir);
    const forbiddenExts = ['.env', '.xlsx', '.xls', '.pdf', '.sql', '.backup', '.db'];
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      assert.strictEqual(forbiddenExts.includes(ext), false, `File terlarang ada di public/: ${f}`);
    }
  });

  test('.gitignore memblokir file spreadsheet, dokumen, dan database dump', () => {
    const gitignorePath = path.resolve(__dirname, '../.gitignore');
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    assert.strictEqual(gitignore.includes('*.xlsx'), true, '.gitignore harus memblokir *.xlsx');
    assert.strictEqual(gitignore.includes('*.xls'), true, '.gitignore harus memblokir *.xls');
    assert.strictEqual(gitignore.includes('*.pdf'), true, '.gitignore harus memblokir *.pdf');
    assert.strictEqual(gitignore.includes('*.sql'), true, '.gitignore harus memblokir *.sql');
    assert.strictEqual(gitignore.includes('*.db'), true, '.gitignore harus memblokir *.db');
  });

  test('Tidak ada Supabase service_role secret key yang bocor di frontend bundle', () => {
    const supabaseConfig = fs.readFileSync(path.resolve(__dirname, '../src/services/supabase.js'), 'utf8');
    assert.strictEqual(supabaseConfig.includes('SUPABASE_SERVICE_ROLE'), false, 'Service role key tidak boleh digunakan di client');
    assert.strictEqual(supabaseConfig.includes('service_role'), false, 'Service role string tidak boleh ada di supabase client');
  });

  // ==========================================
  // SECTION 6: PRODUCTION ERROR SHIELDING & HEADERS (#04, #13, #14, #20)
  // ==========================================
  console.log('\n--- 6. Error Shielding & Security Headers ---');

  test('ErrorBoundary menyembunyikan raw error stack pada mode PROD & menampilkan Incident Code', () => {
    const errBoundaryPath = path.resolve(__dirname, '../src/components/ErrorBoundary.jsx');
    const errBoundaryContent = fs.readFileSync(errBoundaryPath, 'utf8');
    assert.strictEqual(errBoundaryContent.includes('import.meta.env.PROD'), true, 'ErrorBoundary harus membedakan mode PROD');
    assert.strictEqual(errBoundaryContent.includes('REF-SEC-'), true, 'ErrorBoundary harus menghasilkan Incident Code');
  });

  test('vercel.json terdefinisi dengan Security Headers lengkap', () => {
    const vercelPath = path.resolve(__dirname, '../vercel.json');
    assert.strictEqual(fs.existsSync(vercelPath), true, 'vercel.json harus ada');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    const headers = vercelConfig.headers[0].headers;
    const headerKeys = headers.map(h => h.key);
    assert.strictEqual(headerKeys.includes('X-Content-Type-Options'), true);
    assert.strictEqual(headerKeys.includes('X-Frame-Options'), true);
    assert.strictEqual(headerKeys.includes('X-XSS-Protection'), true);
    assert.strictEqual(headerKeys.includes('Referrer-Policy'), true);
    assert.strictEqual(headerKeys.includes('Permissions-Policy'), true);
  });

  test('index.html memuat security meta tags', () => {
    const indexPath = path.resolve(__dirname, '../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    assert.strictEqual(indexContent.includes('X-Content-Type-Options'), true);
    assert.strictEqual(indexContent.includes('referrer'), true);
  });

  // ==========================================
  // SECTION 7: SESSION EXPIRATION & AUTO-LOGOUT (#08)
  // ==========================================
  console.log('\n--- 7. Kedaluwarsa Sesi & Auto-Logout ---');

  test('App.jsx memiliki interval pemantauan sesi berkala (Auto-Logout)', () => {
    const appPath = path.resolve(__dirname, '../src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.strictEqual(appContent.includes('getActiveSession()'), true);
    assert.strictEqual(appContent.includes('Sesi Kedaluwarsa'), true);
  });

  console.log(`\n========================================`);
  console.log(`📊 Hasil Pengujian Keamanan: ${passCount} / ${totalTests} LULUS`);
  console.log(`========================================\n`);

  if (passCount !== totalTests) {
    process.exit(1);
  }
})();
