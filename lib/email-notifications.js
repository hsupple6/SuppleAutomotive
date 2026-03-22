var path = require('path');
var fs = require('fs');

var TEMPLATE_OVERRIDES_PATH = path.join(__dirname, 'email-template-overrides.json');
var SIGNATURES_DIR = path.join(__dirname, '..', 'public', 'signatures');
var DEFAULT_EMAIL_TEMPLATE =
  '<!doctype html><html><body style="margin:0;padding:0;background:#f4f6f8;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px;">' +
  '<tr><td align="center">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8ecf0;">' +
  '<tr><td style="padding:20px 24px;background:#0f1720;text-align:left;">' +
  '<table role="presentation" cellpadding="0" cellspacing="0" style="width:auto;margin:0;"><tr>' +
  '<td style="vertical-align:middle;"><img src="{{LOGO_URL}}" alt="Supple Automotive" style="display:block;max-height:52px;width:auto;"></td>' +
  '<td style="vertical-align:middle;text-align:left;padding-left:6px;font-family:Arial,Helvetica,sans-serif;color:#cfd8e3;white-space:nowrap;">' +
  '<div style="font-size:12px;letter-spacing:0.2em;line-height:1.2;">{{HEADER_TOP}}</div>' +
  '<div style="font-size:12px;letter-spacing:0.2em;line-height:1.2;margin-top:3px;">{{HEADER_BOTTOM}}</div>' +
  '</td></tr></table>' +
  '</td></tr>' +
  '<tr><td style="padding:28px 24px 10px;font-family:Arial,Helvetica,sans-serif;color:#0f1720;">' +
  '<h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;">{{HEADING}}</h1>' +
  '<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#344054;">{{INTRO}}</p>' +
  '{{BODY_HTML}}' +
  '{{ACTION_BLOCK}}' +
  '<div style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#1f2937;">{{SIGNATURE_BLOCK}}</div>' +
  '</td></tr></table></td></tr></table></body></html>';

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBranding() {
  var appBaseUrl = (process.env.APP_BASE_URL || 'https://suppleautomotive.com').replace(/\/$/, '');
  var logoUrl = process.env.EMAIL_LOGO_URL || (appBaseUrl + '/logo/logo1.png');
  var paymentPortalUrl = process.env.PAYMENT_PORTAL_URL || (appBaseUrl + '/payment.html');
  var fromEmail = process.env.RESEND_FROM_EMAIL || 'hlsbusiness@suppleautomotive.com';
  var fromName = process.env.EMAIL_FROM_NAME || 'Supple Automotive';
  var ownerName = process.env.EMAIL_OWNER_NAME || fromName;
  var signatureTitle = process.env.EMAIL_SIGNATURE_TITLE || '';
  var signaturePhone = process.env.EMAIL_SIGNATURE_PHONE || '';
  var signatureEmail = process.env.EMAIL_SIGNATURE_EMAIL || fromEmail;
  return {
    appBaseUrl: appBaseUrl,
    logoUrl: logoUrl,
    paymentPortalUrl: paymentPortalUrl,
    fromEmail: fromEmail,
    fromName: fromName,
    ownerName: ownerName,
    signatureTitle: signatureTitle,
    signaturePhone: signaturePhone,
    signatureEmail: signatureEmail,
    headerTop: 'UPPLE',
    headerBottom: 'AUTOMOTIVE',
    signaturePathPrefix: '/signatures'
  };
}

function pickRandomSignatureFilename() {
  var candidates = [];
  for (var i = 1; i <= 9; i++) {
    var name = 'Signature' + i + '.png';
    var abs = path.join(SIGNATURES_DIR, name);
    if (fs.existsSync(abs)) candidates.push(name);
  }
  if (candidates.length === 0) return '';
  var idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

function renderTemplate(template, tokens) {
  return String(template || '').replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, function (_, key) {
    return tokens[key] != null ? String(tokens[key]) : '';
  });
}

function getEmailTemplate() {
  try {
    if (!fs.existsSync(TEMPLATE_OVERRIDES_PATH)) return DEFAULT_EMAIL_TEMPLATE;
    var parsed = JSON.parse(fs.readFileSync(TEMPLATE_OVERRIDES_PATH, 'utf8'));
    if (parsed && typeof parsed.template === 'string' && parsed.template.trim()) return parsed.template;
  } catch (err) {
    console.warn('Email template read failed:', err && err.message ? err.message : err);
  }
  return DEFAULT_EMAIL_TEMPLATE;
}

function saveEmailTemplate(template) {
  var value = String(template || '');
  if (!value.trim()) throw new Error('Template cannot be empty');
  if (value.length > 100000) throw new Error('Template is too large');
  fs.writeFileSync(
    TEMPLATE_OVERRIDES_PATH,
    JSON.stringify({ template: value }, null, 2),
    'utf8'
  );
  return value;
}

function baseLayout(opts) {
  var brand = getBranding();
  var heading = escapeHtml(opts.heading || '');
  var intro = escapeHtml(opts.intro || '');
  var bodyHtml = opts.bodyHtml || '';
  var actionLabel = opts.actionLabel ? escapeHtml(opts.actionLabel) : '';
  var actionUrl = opts.actionUrl ? escapeHtml(opts.actionUrl) : '';
  var actionBlock = actionLabel && actionUrl
    ? '<p style="margin:28px 0 24px;"><a href="' + actionUrl + '" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;text-decoration:none;font-weight:600;border-radius:8px;">' + actionLabel + '</a></p>'
    : '';

  var signatureFilename = pickRandomSignatureFilename();
  var signatureImageHtml = '';
  if (signatureFilename) {
    var signatureImgUrl = brand.appBaseUrl + brand.signaturePathPrefix + '/' + signatureFilename;
    signatureImageHtml =
      '<div style="margin-top:8px;">' +
      '<img src="' + escapeHtml(signatureImgUrl) + '" alt="Supple Automotive signature" style="display:block;max-height:84px;width:auto;">' +
      '</div>';
  }
  var signatureBlock = 'Regards,<br>Supple Automotive' + signatureImageHtml;
  return renderTemplate(getEmailTemplate(), {
    LOGO_URL: escapeHtml(brand.logoUrl),
    HEADER_TOP: escapeHtml(brand.headerTop),
    HEADER_BOTTOM: escapeHtml(brand.headerBottom),
    HEADING: heading,
    INTRO: intro,
    BODY_HTML: bodyHtml,
    ACTION_BLOCK: actionBlock,
    OWNER_NAME: escapeHtml('Supple Automotive'),
    SIGNATURE_BLOCK: signatureBlock
  });
}

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  var Resend = require('resend').Resend || require('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

function sendEmail(to, subject, html) {
  if (!to) return Promise.resolve({ skipped: true, reason: 'missing-recipient' });
  var client = getClient();
  if (!client) return Promise.resolve({ skipped: true, reason: 'missing-resend-api-key' });
  var brand = getBranding();
  var from = process.env.RESEND_FROM_EMAIL ? brand.fromEmail : (brand.fromName + ' <' + brand.fromEmail + '>');
  return client.emails
    .send({
      from: from,
      to: to,
      subject: subject,
      html: html
    })
    .then(function (result) {
      if (result && result.error) {
        var msg = result.error.message || JSON.stringify(result.error);
        throw new Error(msg);
      }
      return result;
    });
}

function formatVehicle(formData) {
  var pieces = [
    formData.vehicle_year,
    formData.vehicle_make,
    formData.vehicle_model
  ].filter(function (v) {
    return v && String(v).trim();
  });
  return pieces.length ? pieces.join(' ') : 'Vehicle details pending';
}

function sendServiceRequestConfirmation(payload) {
  var contactMethod = payload.contact_preference === 'sms' ? 'SMS' : 'email';
  var body = '' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">We received your service request and will follow up as soon as possible. You selected <strong>' + escapeHtml(contactMethod) + '</strong> for follow-up communication.</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0 6px;border-collapse:collapse;">' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Requested service</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml(payload.service_type || 'General service') + '</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Vehicle</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml(formatVehicle(payload)) + '</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Preferred date/time</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml((payload.preferred_date || 'Flexible') + (payload.preferred_time ? ' · ' + payload.preferred_time : '')) + '</td></tr>' +
    '</table>' +
    '<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#475467;">If you need to add details, reply to this email and we will update your request.</p>';
  return sendEmail(
    payload.email,
    'Your service request has been received',
    baseLayout({
      heading: 'Request Received',
      intro: 'Thank you for contacting Supple Automotive.',
      bodyHtml: body
    })
  );
}

function sendDocumentsAssignedAlert(payload) {
  var body = '' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">New documents were assigned to your account. For security reasons, documents are not attached to this email.</p>' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">Please open your payment portal to review your account and complete any next steps.</p>';
  return sendEmail(
    payload.email,
    'New account documents are available',
    baseLayout({
      heading: 'Account Documents Updated',
      intro: 'There is an important update on your account.',
      bodyHtml: body,
      actionLabel: 'Open Payment Portal',
      actionUrl: getBranding().paymentPortalUrl
    })
  );
}

function sendSignedDocumentAlert(payload) {
  var docType = escapeHtml(payload.documentType || 'document');
  var body = '' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">Thank you for signing. Your signed ' + docType + ' is now available.</p>' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">You can open it directly below or view it anytime in your payment portal documents.</p>';
  return sendEmail(
    payload.email,
    'Your signed document is ready',
    baseLayout({
      heading: 'Signed Document Available',
      intro: 'Your signature has been recorded successfully.',
      bodyHtml: body,
      actionLabel: 'Open Signed Document',
      actionUrl: payload.documentUrl || getBranding().paymentPortalUrl
    })
  );
}

function sendAccountUpdatedAlert(payload) {
  var updateSummary = escapeHtml(payload.updateSummary || 'Your account details were updated.');
  var body = '' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">We are writing to confirm a recent update to your account.</p>' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#111827;"><strong>Update:</strong> ' + updateSummary + '</p>' +
    '<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475467;">If you did not expect this update, reply to this email and we will review it immediately.</p>';
  return sendEmail(
    payload.email,
    'Your Supple Automotive account was updated',
    baseLayout({
      heading: 'Account Update Confirmation',
      intro: 'This message confirms recent account activity.',
      bodyHtml: body,
      actionLabel: 'Review Payment Portal',
      actionUrl: getBranding().paymentPortalUrl
    })
  );
}

function sendOwnerServiceRequestAlert(payload) {
  var recipient = String(payload.ownerEmail || payload.toEmail || '').trim();
  if (!recipient) {
    return Promise.resolve({ skipped: true, reason: 'missing-recipient' });
  }
  var lines = [
    'Name: ' + (payload.name || ''),
    'Email: ' + (payload.email || ''),
    'Phone: ' + (payload.phone || ''),
    'Vehicle: ' + formatVehicle(payload),
    'Service: ' + (payload.service_type || ''),
    'Preferred: ' + ((payload.preferred_date || '') + ' ' + (payload.preferred_time || '')).trim(),
    'Contact preference: ' + (payload.contact_preference || 'email'),
    'Details: ' + (payload.details || ''),
    'Notes: ' + (payload.notes || '')
  ];
  var body = '<pre style="white-space:pre-wrap;margin:0;font-size:13px;line-height:1.6;color:#1f2937;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e5e7eb;">' + escapeHtml(lines.join('\n')) + '</pre>';
  return sendEmail(
    recipient,
    'New service request: ' + (payload.name || 'Unknown customer'),
    baseLayout({
      heading: 'New Service Request',
      intro: 'A customer submitted a new service request.',
      bodyHtml: body
    })
  );
}

function sendManualCustomerEmail(payload) {
  var messageHtml = escapeHtml(payload.message || '').replace(/\n/g, '<br>');
  var body = '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">' + messageHtml + '</p>';
  return sendEmail(
    payload.email,
    payload.subject || 'Message from Supple Automotive',
    baseLayout({
      heading: payload.heading || 'Message from Supple Automotive',
      intro: payload.intro || 'Please review the message below.',
      bodyHtml: body
    })
  );
}

module.exports = {
  getEmailTemplate: getEmailTemplate,
  saveEmailTemplate: saveEmailTemplate,
  sendServiceRequestConfirmation: sendServiceRequestConfirmation,
  sendDocumentsAssignedAlert: sendDocumentsAssignedAlert,
  sendSignedDocumentAlert: sendSignedDocumentAlert,
  sendAccountUpdatedAlert: sendAccountUpdatedAlert,
  sendOwnerServiceRequestAlert: sendOwnerServiceRequestAlert,
  sendManualCustomerEmail: sendManualCustomerEmail
};
