// Minimal CSV -> row-objects parser for the bulk medicine import.
// ponytail: no quoted-field / embedded-comma support — a plain split. Good
// enough for a spreadsheet export of simple columns; swap in a real parser
// (papaparse) if users hit commas-inside-quotes.

const HEADER_ALIASES = {
  name: 'name',
  product: 'name',
  'product name': 'name',
  manufacturer: 'manufacturer',
  brand: 'manufacturer',
  generic: 'generic_name',
  'generic name': 'generic_name',
  generic_name: 'generic_name',
  category: 'category',
  batch: 'batch_number',
  'batch number': 'batch_number',
  batch_number: 'batch_number',
  price: 'selling_price',
  'selling price': 'selling_price',
  selling_price: 'selling_price',
  cost: 'cost_price',
  'cost price': 'cost_price',
  cost_price: 'cost_price',
  qty: 'quantity',
  quantity: 'quantity',
  stock: 'quantity',
  'low stock': 'low_stock_threshold',
  low_stock_threshold: 'low_stock_threshold',
  reorder_level: 'low_stock_threshold',
  expiry: 'expiry_date',
  'expiry date': 'expiry_date',
  expiry_date: 'expiry_date',
  rx: 'prescription_required',
  prescription: 'prescription_required',
  prescription_required: 'prescription_required',
};

const canonical = (h) => HEADER_ALIASES[String(h).trim().toLowerCase()] || null;

export function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { headers: [], rows: [], unknownHeaders: [] };

  const rawHeaders = lines[0].split(',').map((h) => h.trim());
  const mapped = rawHeaders.map(canonical);
  const unknownHeaders = rawHeaders.filter((_, i) => !mapped[i]);

  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const obj = {};
    mapped.forEach((key, i) => {
      if (key && cells[i] !== undefined && cells[i] !== '') obj[key] = cells[i];
    });
    return obj;
  });

  return { headers: mapped.filter(Boolean), rows, unknownHeaders };
}
