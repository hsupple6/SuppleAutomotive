var PREFIX = 'HLSAuto-';
var PAD_LENGTH = 4;

function formatInvoiceNumber(sequence) {
  var n = Math.max(1, Math.floor(Number(sequence) || 1));
  return PREFIX + String(n).padStart(PAD_LENGTH, '0');
}

function parseSequence(invoiceNumber) {
  if (!invoiceNumber) return null;
  var m = String(invoiceNumber).trim().match(/^HLSAuto-(\d+)$/i);
  if (!m) return null;
  var n = parseInt(m[1], 10);
  return isFinite(n) ? n : null;
}

function maxSequenceFromNumbers(numbers) {
  var max = 0;
  (numbers || []).forEach(function (num) {
    var seq = parseSequence(num);
    if (seq != null && seq > max) max = seq;
  });
  return max;
}

function getNextInvoiceNumber(supabase, accountId) {
  if (!supabase || !accountId) {
    return Promise.resolve(formatInvoiceNumber(1));
  }
  return Promise.all([
    supabase
      .from('service_invoices')
      .select('invoice_number')
      .eq('account_id', accountId)
      .ilike('invoice_number', PREFIX + '%'),
    supabase
      .from('builder_document_saves')
      .select('payload')
      .eq('account_id', accountId)
      .eq('document_type', 'invoice')
  ]).then(function (results) {
    var invResult = results[0];
    var saveResult = results[1];
    if (invResult.error) throw new Error(invResult.error.message || 'Could not read invoice numbers');
    if (saveResult.error) throw new Error(saveResult.error.message || 'Could not read saved invoices');
    var numbers = [];
    (invResult.data || []).forEach(function (row) {
      if (row.invoice_number) numbers.push(row.invoice_number);
    });
    (saveResult.data || []).forEach(function (row) {
      var payload = row.payload || {};
      if (payload.invoiceNumber) numbers.push(payload.invoiceNumber);
    });
    return formatInvoiceNumber(maxSequenceFromNumbers(numbers) + 1);
  });
}

module.exports = {
  PREFIX: PREFIX,
  formatInvoiceNumber: formatInvoiceNumber,
  parseSequence: parseSequence,
  getNextInvoiceNumber: getNextInvoiceNumber
};
