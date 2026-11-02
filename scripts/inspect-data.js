import xlsx from 'xlsx';
import path from 'path';

const filePath = path.join(process.env.USERPROFILE, 'Downloads', 'Transaksi 01-01-2026 - 02-11-2026.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Sample rows:');
rows.slice(0, 15).forEach((r) => {
  console.log(`${r[0]} | ${r[1]} | ${r[4]} | ${r[5]} -> ${r[6]} | Status: ${r[9]}`);
});
