var fs = require('fs');
var path = require('path');
var os = require('os');

var DEFAULT_ROOT = path.join(os.homedir(), 'Desktop', 'Business Sheit', 'CustomerInfo');

function getExportRoot() {
  var custom = String(process.env.CUSTOMER_EXPORT_ROOT || '').trim();
  return custom || DEFAULT_ROOT;
}

function sanitizeFolderName(name) {
  return (
    String(name || 'Unknown Customer')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Unknown Customer'
  );
}

function customerInitials(name) {
  var parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'UNK-UNK';
  var firstWord = parts[0].replace(/[^a-zA-Z]/g, '').toUpperCase();
  var lastWord = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).replace(/[^a-zA-Z]/g, '').toUpperCase();
  var fi = firstWord.slice(0, 3) || 'UNK';
  var li = lastWord.slice(0, 3) || 'UNK';
  return fi + '-' + li;
}

function formatExportDate(d) {
  var dt = d instanceof Date ? d : new Date(d || Date.now());
  var y = dt.getFullYear();
  var m = String(dt.getMonth() + 1).padStart(2, '0');
  var day = String(dt.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function normalizeDocumentType(docType) {
  var t = String(docType || '').toLowerCase();
  if (t === 'invoice') return 'Invoice';
  if (t === 'estimate') return 'Estimate';
  if (t === 'spreadsheet') return 'Spreadsheet';
  return 'Document';
}

function sanitizeFilenamePart(value) {
  return (
    String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || ''
  );
}

function buildExportFilename(opts) {
  opts = opts || {};
  var docLabel = normalizeDocumentType(opts.documentType);
  var customerName = opts.customerName || (opts.customer && opts.customer.name) || '';
  var initials = customerInitials(customerName);
  var dateStr = formatExportDate(opts.date);
  var invNo = sanitizeFilenamePart(opts.invoiceNumber);
  var base = docLabel;
  if (invNo) base += '-' + invNo;
  base += '-' + initials + '-' + dateStr;
  if (opts.suffix) base += String(opts.suffix);
  if (opts.pageSuffix) base += String(opts.pageSuffix);
  var ext = String(opts.extension || 'pdf').replace(/^\./, '');
  return base + '.' + ext;
}

function getCustomerExportDir(customerName) {
  return path.join(getExportRoot(), sanitizeFolderName(customerName));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function saveCustomerExport(opts) {
  opts = opts || {};
  var customerName = (opts.customer && opts.customer.name) || opts.customerName || 'Unknown Customer';
  var dir = getCustomerExportDir(customerName);
  ensureDir(dir);
  var filename = opts.filename || buildExportFilename(opts);
  var fullPath = path.join(dir, filename);
  var buf;
  if (Buffer.isBuffer(opts.content)) {
    buf = opts.content;
  } else if (opts.contentBase64) {
    buf = Buffer.from(opts.contentBase64, 'base64');
  } else if (typeof opts.content === 'string') {
    buf = Buffer.from(opts.content, 'utf8');
  } else {
    throw new Error('Export content is required');
  }
  fs.writeFileSync(fullPath, buf);
  return { path: fullPath, filename: filename, directory: dir };
}

function trySaveCustomerExport(opts) {
  try {
    return { ok: true, result: saveCustomerExport(opts) };
  } catch (err) {
    console.error('Customer export save failed:', err.message || err);
    return { ok: false, error: err.message || String(err) };
  }
}

function attachExportHeaders(res, saved) {
  if (!saved || !saved.ok || !saved.result) return;
  res.setHeader('X-Customer-Export-Path', saved.result.path);
  res.setHeader('X-Customer-Export-Filename', saved.result.filename);
  res.setHeader('X-Customer-Export-Display-Path', displayPath(saved.result.path));
}

function csvEscape(value) {
  var s = String(value == null ? '' : value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function buildSpreadsheetCsv(rows) {
  var headers = [
    'Invoice #',
    'Part Name',
    'Part #',
    'Date',
    'Unit Cost',
    'Unit Price',
    'Customer',
    'Collected Sales Tax'
  ];
  var lines = [headers.map(csvEscape).join(',')];
  (rows || []).forEach(function (row) {
    lines.push((row || []).map(csvEscape).join(','));
  });
  return lines.join('\n') + '\n';
}

function displayPath(fullPath) {
  var home = os.homedir();
  if (fullPath.indexOf(home) === 0) {
    return '~' + fullPath.slice(home.length);
  }
  return fullPath;
}

module.exports = {
  getExportRoot: getExportRoot,
  customerInitials: customerInitials,
  buildExportFilename: buildExportFilename,
  getCustomerExportDir: getCustomerExportDir,
  saveCustomerExport: saveCustomerExport,
  trySaveCustomerExport: trySaveCustomerExport,
  attachExportHeaders: attachExportHeaders,
  buildSpreadsheetCsv: buildSpreadsheetCsv,
  displayPath: displayPath
};
