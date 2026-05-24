/**
 * Append invoice part rows to the Google Sheets "Customer" tab in Receipt Tracker - {year}.
 * Requires a Google service account with access to the shared Drive folder.
 */
var google = require('googleapis').google;

var SHEET_TAB = 'Customer';
var DATA_RANGE = SHEET_TAB + '!B:I';

function isConfigured() {
  if (process.env.GOOGLE_RECEIPT_TRACKER_SPREADSHEET_ID) return true;
  if (process.env.GOOGLE_DRIVE_RECEIPTS_FOLDER_ID) return true;
  if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) return true;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return true;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) return true;
  return false;
}

function parsePrivateKey(raw) {
  if (!raw) return '';
  var key = String(raw).trim();
  if (
    (key.charAt(0) === '"' && key.charAt(key.length - 1) === '"') ||
    (key.charAt(0) === "'" && key.charAt(key.length - 1) === "'")
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, '\n').replace(/\r/g, '');
  if (key.indexOf('\n') === -1 && key.indexOf('-----BEGIN') !== -1) {
    key = key
      .replace(/-----BEGIN ([A-Z ]+PRIVATE KEY)-----/, '-----BEGIN $1-----\n')
      .replace(/-----END ([A-Z ]+PRIVATE KEY)-----/, '\n-----END $1-----\n');
  }
  return key.trim();
}

function assertValidPrivateKey(key) {
  if (!key) {
    throw new Error('Google service account private key is not configured');
  }
  var compact = key.replace(/\s/g, '');
  if (/^AIza[0-9A-Za-z_-]+$/.test(compact)) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY looks like a Google API key. Use the service account PEM private key (-----BEGIN PRIVATE KEY-----) from your JSON key file, or set GOOGLE_SERVICE_ACCOUNT_JSON to the full service account JSON.'
    );
  }
  if (!/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(key)) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be a PEM private key (starts with -----BEGIN PRIVATE KEY-----). Download the service account JSON from Google Cloud Console.'
    );
  }
}

function getServiceAccountCredentials() {
  var jsonRaw = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (jsonRaw) {
    var parsed = JSON.parse(jsonRaw);
    return {
      client_email: parsed.client_email,
      private_key: parsePrivateKey(parsed.private_key)
    };
  }
  return {
    client_email: String(process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || '').trim(),
    private_key: parsePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
  };
}

function getAuthClient() {
  var creds = getServiceAccountCredentials();
  if (!creds.client_email || !creds.private_key) {
    throw new Error('Google service account credentials are not configured');
  }
  assertValidPrivateKey(creds.private_key);
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  });
}

function getPartsTaxRate() {
  var raw = process.env.GOOGLE_RECEIPT_PARTS_TAX_PERCENT;
  if (raw == null || String(raw).trim() === '') return 0.0725;
  var n = parseFloat(String(raw).replace('%', '').trim());
  if (!isFinite(n) || n < 0) return 0.0725;
  return n > 1 ? n / 100 : n;
}

function formatMoney(n) {
  var v = Number(n);
  if (!isFinite(v)) return '';
  return v.toFixed(2);
}

function formatSheetDate(d) {
  var dt = d instanceof Date ? d : new Date(d || Date.now());
  var mo = dt.getMonth() + 1;
  var dy = dt.getDate();
  var yr = dt.getFullYear();
  return (mo < 10 ? '0' : '') + mo + '/' + (dy < 10 ? '0' : '') + dy + '/' + yr;
}

function escapeDriveQueryString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function findChildFolder(drive, parentId, name) {
  var q = [
    "mimeType='application/vnd.google-apps.folder'",
    'trashed=false',
    "name='" + escapeDriveQueryString(name) + "'",
    "'" + parentId + "' in parents"
  ].join(' and ');
  return drive.files
    .list({
      q: q,
      fields: 'files(id, name)',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })
    .then(function (res) {
      var files = (res && res.data && res.data.files) || [];
      if (!files.length) throw new Error('Drive folder not found: ' + name);
      return files[0].id;
    });
}

function listSpreadsheetsInFolder(drive, parentId) {
  var q = [
    "mimeType='application/vnd.google-apps.spreadsheet'",
    'trashed=false',
    "'" + parentId + "' in parents"
  ].join(' and ');
  return drive.files
    .list({
      q: q,
      fields: 'files(id, name)',
      pageSize: 20,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })
    .then(function (res) {
      return (res && res.data && res.data.files) || [];
    });
}

function findSpreadsheetInFolder(drive, parentId, name) {
  var q = [
    "mimeType='application/vnd.google-apps.spreadsheet'",
    'trashed=false',
    "name='" + escapeDriveQueryString(name) + "'",
    "'" + parentId + "' in parents"
  ].join(' and ');
  return drive.files
    .list({
      q: q,
      fields: 'files(id, name)',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })
    .then(function (res) {
      var files = (res && res.data && res.data.files) || [];
      if (!files.length) throw new Error('Spreadsheet not found: ' + name);
      return files[0].id;
    });
}

function spreadsheetNameCandidates(year) {
  var yearName = String(year);
  var custom = String(process.env.GOOGLE_RECEIPT_TRACKER_SHEET_NAME || '').trim();
  var names = [];
  if (custom) names.push(custom);
  names.push('Receipt Tracker - ' + yearName);
  names.push('Reciept Tracker - ' + yearName);
  var seen = {};
  return names.filter(function (n) {
    if (seen[n]) return false;
    seen[n] = true;
    return true;
  });
}

function findSpreadsheetByNameInFolder(drive, parentId, names) {
  return listSpreadsheetsInFolder(drive, parentId).then(function (files) {
    for (var i = 0; i < names.length; i++) {
      var target = names[i];
      var match = files.find(function (f) {
        return f.name === target;
      });
      if (match) return match.id;
    }
    var yearMatch = names[0] && names[0].match(/(\d{4})\s*$/);
    if (yearMatch) {
      var year = yearMatch[1];
      var loose = files.find(function (f) {
        return /receipt?\s*tracker/i.test(f.name) && f.name.indexOf(year) !== -1;
      });
      if (loose) return loose.id;
    }
    return null;
  });
}

function resolveSpreadsheetInReceiptsTree(drive, receiptsFolderId, year) {
  var names = spreadsheetNameCandidates(year);
  return findSpreadsheetByNameInFolder(drive, receiptsFolderId, names).then(function (directId) {
    if (directId) return directId;
    return findChildFolder(drive, receiptsFolderId, String(year))
      .then(function (yearFolderId) {
        return findSpreadsheetByNameInFolder(drive, yearFolderId, names);
      })
      .then(function (nestedId) {
        if (nestedId) return nestedId;
        throw new Error(
          'Spreadsheet not found. Looked in Receipts and Receipts/' +
            year +
            ' for: ' +
            names.join(', ')
        );
      });
  });
}

function resolveSpreadsheetId(drive, year) {
  var direct = String(process.env.GOOGLE_RECEIPT_TRACKER_SPREADSHEET_ID || '').trim();
  if (direct) return Promise.resolve(direct);

  var receiptsFolderId = String(process.env.GOOGLE_DRIVE_RECEIPTS_FOLDER_ID || '').trim();
  var rootFolderId = String(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim();

  if (receiptsFolderId) {
    return resolveSpreadsheetInReceiptsTree(drive, receiptsFolderId, year);
  }

  if (rootFolderId) {
    return findChildFolder(drive, rootFolderId, 'Receipts').then(function (receiptsId) {
      return resolveSpreadsheetInReceiptsTree(drive, receiptsId, year);
    });
  }

  throw new Error('Set GOOGLE_RECEIPT_TRACKER_SPREADSHEET_ID or a Drive folder ID env var');
}

function buildPartRows(opts) {
  var invoiceNumber = opts.invoiceNumber || '';
  var customerName = (opts.customer && opts.customer.name) ? String(opts.customer.name).trim() : '';
  var parts = Array.isArray(opts.parts) ? opts.parts : [];
  var invoiceDate = opts.invoiceDate || new Date();
  var dateStr = formatSheetDate(invoiceDate);
  var taxRate = getPartsTaxRate();

  return parts.map(function (part) {
    var qty = Number(part.quantity) || 1;
    var unitPrice = Number(part.unit_price) || 0;
    var lineTotal = part.total_price != null ? Number(part.total_price) : qty * unitPrice;
    var unitCostRaw = part.unit_cost;
    var unitCost = unitCostRaw == null || unitCostRaw === '' ? '' : formatMoney(unitCostRaw);
    var salesTax = formatMoney(lineTotal * taxRate);

    return [
      invoiceNumber,
      String(part.part_name || '').trim(),
      part.part_number ? String(part.part_number).trim() : '',
      dateStr,
      unitCost,
      formatMoney(unitPrice),
      customerName,
      salesTax
    ];
  });
}

function appendInvoicePartRows(opts) {
  if (!isConfigured()) {
    return Promise.resolve({ skipped: true, reason: 'not_configured' });
  }

  var rows = buildPartRows(opts);
  if (!rows.length) {
    return Promise.resolve({ skipped: true, reason: 'no_parts' });
  }

  var invoiceDate = opts.invoiceDate || new Date();
  var year = invoiceDate.getFullYear();
  var auth;
  try {
    auth = getAuthClient();
  } catch (err) {
    return Promise.reject(err);
  }
  var drive = google.drive({ version: 'v3', auth: auth });
  var sheets = google.sheets({ version: 'v4', auth: auth });

  return resolveSpreadsheetId(drive, year).then(function (spreadsheetId) {
    return sheets.spreadsheets.values
      .append({
        spreadsheetId: spreadsheetId,
        range: DATA_RANGE,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: rows }
      })
      .then(function (res) {
        return {
          spreadsheetId: spreadsheetId,
          updatedRange: res.data && res.data.updates ? res.data.updates.updatedRange : null,
          rowCount: rows.length
        };
      });
  });
}

module.exports = {
  isConfigured: isConfigured,
  appendInvoicePartRows: appendInvoicePartRows,
  buildPartRows: buildPartRows
};
