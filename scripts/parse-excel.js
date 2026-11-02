import xlsx from 'xlsx';
import path from 'path';

const filePath = path.join(process.env.USERPROFILE, 'Downloads', 'Transaksi 01-01-2026 - 02-11-2026.xlsx');
console.log('Reading file:', filePath);

const workbook = xlsx.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== SHEET: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total rows: ${json.length}`);
  console.log('Sample first 10 rows:');
  json.slice(0, 10).forEach((row, i) => console.log(`Row ${i}:`, JSON.stringify(row)));
});
