var crypto = require('crypto');
var estimatePdf = require('./estimate-pdf');
var customerExportFiles = require('./customer-export-files');
var shopDatetime = require('./shop-datetime');

var STORAGE_BUCKET = 'invoices';

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function appBaseUrl() {
  return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function publicDocumentUrl(token) {
  return appBaseUrl() + '/document.html?t=' + encodeURIComponent(token);
}

function uploadPdf(supabase, pathKey, pdfBuf) {
  return supabase.storage
    .from(STORAGE_BUCKET)
    .upload(pathKey, pdfBuf, { contentType: 'application/pdf', upsert: true })
    .then(function (up) {
      if (up.error) throw new Error(up.error.message || 'Upload failed');
      var pub = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(pathKey);
      var url = pub && pub.data && pub.data.publicUrl;
      if (!url) throw new Error('Could not get public URL');
      return url;
    });
}

function insertLink(supabase, row) {
  return supabase.from('document_public_links').insert(row).select('*').single();
}

function getByToken(supabase, token) {
  return supabase.from('document_public_links').select('*').eq('token', token).maybeSingle();
}

function buildEstimatePdf(customer, fields) {
  var normalized = estimatePdf.normalizeEstimateReleaseFields(fields || {});
  var resolvedVeh = estimatePdf.resolveVehicleForDocument(normalized, null);
  return estimatePdf.buildEstimatePdfBuffer(customer, resolvedVeh, { releaseFields: normalized });
}

function buildSignedEstimatePdf(customer, fields, mode, payloadStr, signedAt) {
  var normalized = estimatePdf.normalizeEstimateReleaseFields(fields || {});
  var resolvedVeh = estimatePdf.resolveVehicleForDocument(normalized, null);
  var when = signedAt instanceof Date ? signedAt : new Date();
  return estimatePdf.buildEstimatePdfBuffer(customer, resolvedVeh, {
    releaseFields: normalized,
    customerSignature: { mode: mode, payload: payloadStr },
    signedDateStr: shopDatetime.formatDocumentDate(when),
    authMethod: 'email',
    authTimeStr: shopDatetime.formatDocumentTime(when),
    authEmailStr: String(customer.email || '').trim(),
    authPhoneStr: String(customer.phone || '').trim()
  });
}

function buildInvoicePdf(bundle, invoiceNumber) {
  var buildInvoicePdfBuffer = require('./invoice-pdf').buildInvoicePdfBuffer;
  return buildInvoicePdfBuffer(Object.assign({ invoiceNumber: invoiceNumber || 'DRAFT' }, bundle));
}

function createEstimateSigningLink(supabase, accountId, customer, fields) {
  var token = generateToken();
  return buildEstimatePdf(customer, fields).then(function (pdfBuf) {
    var pathKey = 'public-docs/' + token + '/unsigned.pdf';
    return uploadPdf(supabase, pathKey, pdfBuf).then(function (url) {
      return insertLink(supabase, {
        account_id: accountId,
        token: token,
        document_type: 'estimate',
        status: 'pending_signature',
        customer_name: String(customer.name || '').trim() || 'Customer',
        customer_email: customer.email ? String(customer.email).trim() : null,
        payload: { customer: customer, fields: fields },
        unsigned_pdf_url: url
      });
    });
  });
}

function createInvoiceReleaseLink(supabase, accountId, customer, fields, invoiceNumber) {
  var documentBuilder = require('./document-builder');
  var token = generateToken();
  var bundle = documentBuilder.builderFieldsToInvoiceBundle(customer, fields);
  var invNo = String(invoiceNumber || '').trim() || 'DRAFT';
  return buildInvoicePdf(bundle, invNo).then(function (pdfBuf) {
    var pathKey = 'public-docs/' + token + '/invoice.pdf';
    return uploadPdf(supabase, pathKey, pdfBuf).then(function (url) {
      return insertLink(supabase, {
        account_id: accountId,
        token: token,
        document_type: 'invoice',
        status: 'released',
        customer_name: String(customer.name || '').trim() || 'Customer',
        customer_email: customer.email ? String(customer.email).trim() : null,
        payload: { customer: customer, fields: fields, invoiceNumber: invNo },
        unsigned_pdf_url: url,
        signed_pdf_url: url
      });
    });
  });
}

function linkToPublicMeta(row) {
  if (!row) return null;
  var isEstimate = row.document_type === 'estimate';
  var isSigned = row.status === 'signed';
  var isReleased = row.status === 'released';
  return {
    token: row.token,
    documentType: row.document_type,
    status: row.status,
    customerName: row.customer_name,
    requiresSignature: isEstimate && row.status === 'pending_signature',
    isSigned: isSigned,
    isViewOnly: isReleased || (isEstimate && isSigned),
    signedAt: row.signed_at,
    title: isEstimate
      ? isSigned
        ? 'Signed estimate'
        : 'Estimate — signature required'
      : 'Invoice'
  };
}

function pdfUrlForLink(row) {
  if (!row) return null;
  if (row.signed_pdf_url) return row.signed_pdf_url;
  return row.unsigned_pdf_url;
}

function completeEstimateSignature(supabase, row, mode, payloadStr) {
  if (row.document_type !== 'estimate' || row.status !== 'pending_signature') {
    var err = new Error('This document is not awaiting signature');
    err.status = 409;
    return Promise.reject(err);
  }
  var payload = row.payload || {};
  var customer = payload.customer || { name: row.customer_name };
  var fields = payload.fields || {};
  var signedAt = new Date();
  return buildSignedEstimatePdf(customer, fields, mode, payloadStr, signedAt).then(function (signedBuf) {
    var pathKey = 'public-docs/' + row.token + '/signed.pdf';
    return uploadPdf(supabase, pathKey, signedBuf).then(function (signedUrl) {
      customerExportFiles.trySaveCustomerExport({
        documentType: 'estimate',
        customer: customer,
        extension: 'pdf',
        suffix: '-signed',
        content: signedBuf
      });
      return supabase
        .from('document_public_links')
        .update({
          status: 'signed',
          signed_pdf_url: signedUrl,
          signature_mode: mode,
          signature_payload: payloadStr,
          signed_at: signedAt.toISOString()
        })
        .eq('id', row.id)
        .eq('status', 'pending_signature')
        .select('*')
        .single()
        .then(function (up) {
          if (up.error) throw new Error(up.error.message || 'Update failed');
          if (!up.data) {
            var e = new Error('Already signed');
            e.status = 409;
            throw e;
          }
          return { row: up.data, signedBuf: signedBuf, signedUrl: signedUrl };
        });
    });
  });
}

module.exports = {
  generateToken: generateToken,
  publicDocumentUrl: publicDocumentUrl,
  getByToken: getByToken,
  linkToPublicMeta: linkToPublicMeta,
  pdfUrlForLink: pdfUrlForLink,
  createEstimateSigningLink: createEstimateSigningLink,
  createInvoiceReleaseLink: createInvoiceReleaseLink,
  completeEstimateSignature: completeEstimateSignature
};
