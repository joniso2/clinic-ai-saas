const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const dir = path.join(process.cwd(), 'public', 'templates');
fs.mkdirSync(dir, { recursive: true });
const wb = XLSX.utils.book_new();

// Sheet 1: לקוחות (Customers)
const wsCustomers = XLSX.utils.aoa_to_sheet([
  ['Name', 'Phone', 'Email', 'LastVisit', 'Revenue'],
  ['Example Patient', '0500000000', 'example@email.com', '2026-03-01', 250],
]);
wsCustomers['!cols'] = [
  { wch: 22 },  // Name
  { wch: 14 },  // Phone
  { wch: 28 },  // Email
  { wch: 12 },  // LastVisit
  { wch: 10 },  // Revenue
];
XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

// Sheet 2: לידים שטופלו (Closed Leads) - same columns for importing treated leads
const wsLeads = XLSX.utils.aoa_to_sheet([
  ['Name', 'Phone', 'Email', 'LastVisit', 'Revenue'],
  ['ליד לדוגמה', '0501234567', 'lead@example.com', '2026-03-01', 500],
]);
wsLeads['!cols'] = [
  { wch: 22 },
  { wch: 14 },
  { wch: 28 },
  { wch: 12 },
  { wch: 10 },
];
XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads');

XLSX.writeFile(wb, path.join(dir, 'customers_import_template.xlsx'));
console.log('Created public/templates/customers_import_template.xlsx');
