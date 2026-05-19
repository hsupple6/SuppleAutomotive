var path = require('path');
var fs = require('fs');
var portalMagic = require(path.join(__dirname, 'portal-magic'));

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

function pdfAttachmentFromBuffer(buffer, filename) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  return {
    filename: String(filename || 'document.pdf').replace(/[^\w.\-]/g, '_'),
    content: buffer.toString('base64')
  };
}

function sendEmail(to, subject, html, options) {
  options = options || {};
  if (!to) return Promise.resolve({ skipped: true, reason: 'missing-recipient' });
  var client = getClient();
  if (!client) return Promise.resolve({ skipped: true, reason: 'missing-resend-api-key' });
  var brand = getBranding();
  var from = process.env.RESEND_FROM_EMAIL ? brand.fromEmail : (brand.fromName + ' <' + brand.fromEmail + '>');
  var payload = {
    from: from,
    to: to,
    subject: subject,
    html: html
  };
  if (Array.isArray(options.attachments) && options.attachments.length) {
    payload.attachments = options.attachments;
  }
  return client.emails
    .send(payload)
    .then(function (result) {
      if (result && result.error) {
        var msg = result.error.message || JSON.stringify(result.error);
        throw new Error(msg);
      }
      return result;
    });
}

function phoneDigits10(str) {
  if (!str) return '';
  var d = String(str).replace(/\D/g, '');
  return d.length <= 10 ? d : d.slice(-10);
}

function phoneToE164(str) {
  var d = phoneDigits10(str);
  if (d.length !== 10) return null;
  return '+1' + d;
}

function sendTwilioSms(toE164, body) {
  var sid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  var token = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  var from = String(process.env.TWILIO_FROM_NUMBER || '').trim();
  var messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  if (!sid || !token) {
    return Promise.resolve({ skipped: true, reason: 'twilio-not-configured' });
  }
  if (!from && !messagingServiceSid) {
    return Promise.resolve({ skipped: true, reason: 'twilio-missing-from-or-messaging-service' });
  }
  var twilio = require('twilio');
  var client = twilio(sid, token);
  var opts = { to: toE164, body: body };
  if (messagingServiceSid) opts.messagingServiceSid = messagingServiceSid;
  else opts.from = from;
  return client.messages.create(opts);
}

/** When customer prefers SMS, send a short parallel text with one-tap portal link. */
function mirrorCustomerSms(payload, lines) {
  if (String(payload.contact_preference || '').toLowerCase() !== 'sms') {
    return Promise.resolve({ skipped: true, reason: 'not-sms-preference' });
  }
  var to = phoneToE164(payload.phone);
  if (!to) {
    console.info('SMS mirror skipped: could not build E.164 from phone (need 10 US digits).');
    return Promise.resolve({ skipped: true, reason: 'no-phone' });
  }
  var brand = getBranding();
  var portal = portalMagic.portalUrlWithToken(brand.paymentPortalUrl, payload.customerId);
  var msg = (lines || []).join('\n').trim();
  if (portal) msg += '\n\nPortal: ' + portal;
  if (msg.length > 1500) msg = msg.slice(0, 1497) + '…';
  return sendTwilioSms(to, msg).then(function (result) {
    if (result && result.skipped) {
      console.warn('SMS mirror skipped:', result.reason || 'twilio');
      return result;
    }
    console.info('SMS mirror sent to', to);
    return { sent: true };
  }).catch(function (err) {
    console.warn('Twilio SMS failed:', err && err.message ? err.message : err);
    return { skipped: true, reason: err && err.message ? err.message : 'twilio-error' };
  });
}

function portalUrlForEmail(payload, fallbackUrl) {
  var brand = getBranding();
  var fb = fallbackUrl != null && fallbackUrl !== '' ? fallbackUrl : brand.paymentPortalUrl;
  if (payload && payload.customerId) {
    var signed = portalMagic.portalUrlWithToken(brand.paymentPortalUrl, payload.customerId);
    if (signed && signed.indexOf('p=') !== -1) return signed;
  }
  return fb;
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

function formatWorkLocation(val) {
  if (!val || !String(val).trim()) return '';
  var map = {
    garage: 'Garage',
    driveway: 'Driveway',
    lot: 'Lot',
    street: 'Street',
    other: 'Other'
  };
  var k = String(val).trim().toLowerCase();
  return map[k] || String(val).trim();
}

function sendServiceRequestConfirmation(payload) {
  var contactMethod = payload.contact_preference === 'sms' ? 'SMS' : 'email';
  var portalLine = '';
  if (payload.customerId) {
    var pu = portalUrlForEmail(payload, null);
    portalLine =
      '<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#475467;">Your user portal (signed-in link): <a href="' +
      escapeHtml(pu) +
      '" style="color:#0f1720;">Open portal</a></p>';
  }
  var body = '' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">We received your service request and will follow up as soon as possible. You selected <strong>' + escapeHtml(contactMethod) + '</strong> for follow-up communication.</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0 6px;border-collapse:collapse;">' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Requested service</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml(payload.service_type || 'General service') + '</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Vehicle</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml(formatVehicle(payload)) + '</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Service address</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml((payload.service_address && String(payload.service_address).trim()) ? String(payload.service_address).trim() : '—') + '</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Work location</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml(formatWorkLocation(payload.work_location) || '—') + '</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:14px;color:#667085;">Preferred date/time</td><td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">' + escapeHtml((payload.preferred_date || 'Flexible') + (payload.preferred_time ? ' · ' + payload.preferred_time : '')) + '</td></tr>' +
    '</table>' +
    '<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#475467;">If you need to add details, reply to this email and we will update your request.</p>' +
    portalLine;
  return sendEmail(
    payload.email,
    'Your service request has been received',
    baseLayout({
      heading: 'Request Received',
      intro: 'Thank you for contacting Supple Automotive.',
      bodyHtml: body
    })
  ).then(function (r) {
    return mirrorCustomerSms(payload, [
      'Supple Automotive: We got your service request.',
      'Service: ' + String(payload.service_type || 'General').slice(0, 80),
      'Vehicle: ' + formatVehicle(payload).slice(0, 80)
    ]).then(function () {
      return r;
    });
  });
}

function sendDocumentsAssignedAlert(payload) {
  var docTitle = escapeHtml(payload.documentTitle || 'Document');
  var docType = String(payload.documentType || 'document').toLowerCase();
  var hasAttachment = payload.pdfBuffer && Buffer.isBuffer(payload.pdfBuffer) && payload.pdfBuffer.length > 0;
  var openDocUrl = String(payload.documentUrl || '').trim();
  var body = '' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">A new ' + docTitle.toLowerCase() + ' was added to your account' +
    (hasAttachment ? ' and is attached to this email as a PDF.' : '.') + '</p>' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">Open your user portal to review your account, view documents, and complete any required electronic signature.</p>';
  if (openDocUrl) {
    body +=
      '<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475467;">You can also <a href="' +
      escapeHtml(openDocUrl) +
      '" style="color:#0f1720;">open the PDF directly</a>.</p>';
  }
  var attachment = hasAttachment
    ? pdfAttachmentFromBuffer(payload.pdfBuffer, payload.pdfFilename || (docType === 'estimate' ? 'estimate.pdf' : 'document.pdf'))
    : null;
  return sendEmail(
    payload.email,
    (docType === 'estimate' ? 'Your repair estimate is ready' : 'New account documents are available'),
    baseLayout({
      heading: docType === 'estimate' ? 'Estimate Ready for Review' : 'Account Documents Updated',
      intro: 'There is an important update on your account.',
      bodyHtml: body,
      actionLabel: 'Open User Portal',
      actionUrl: portalUrlForEmail(payload, getBranding().paymentPortalUrl)
    }),
    attachment ? { attachments: [attachment] } : undefined
  ).then(function (r) {
    return mirrorCustomerSms(payload, [
      'Supple Automotive: New ' + String(payload.documentTitle || 'documents').toLowerCase() + ' on your account.',
      'Open your portal to review or sign.'
    ]).then(function () {
      return r;
    });
  });
}

function sendSignedDocumentAlert(payload) {
  var docTypeLabel = escapeHtml(payload.documentType || 'document');
  var docType = String(payload.documentType || 'document').toLowerCase();
  var openDocUrl = String(payload.documentUrl || '').trim();
  var hasAttachment = payload.pdfBuffer && Buffer.isBuffer(payload.pdfBuffer) && payload.pdfBuffer.length > 0;
  var body = '' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">Thank you for signing. Your signed ' + docTypeLabel + ' is now available' +
    (hasAttachment ? ' and is attached to this email as a PDF.' : '.') + '</p>' +
    '<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#344054;">You can also view it anytime in your user portal documents.</p>';
  if (openDocUrl) {
    body +=
      '<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475467;"><a href="' +
      escapeHtml(openDocUrl) +
      '" style="color:#0f1720;">Open signed PDF</a></p>';
  }
  var attachment = hasAttachment
    ? pdfAttachmentFromBuffer(
        payload.pdfBuffer,
        payload.pdfFilename || (docType === 'estimate' ? 'signed-estimate.pdf' : 'signed-document.pdf')
      )
    : null;
  return sendEmail(
    payload.email,
    docType === 'estimate' ? 'Your signed estimate is ready' : 'Your signed document is ready',
    baseLayout({
      heading: 'Signed Document Available',
      intro: 'Your signature has been recorded successfully.',
      bodyHtml: body,
      actionLabel: 'Open User Portal',
      actionUrl: portalUrlForEmail(payload, getBranding().paymentPortalUrl)
    }),
    attachment ? { attachments: [attachment] } : undefined
  ).then(function (r) {
    var smsLines = [
      'Supple Automotive: Your signed ' + String(payload.documentType || 'document') + ' is ready.',
      openDocUrl ? 'PDF: ' + openDocUrl.slice(0, 120) : 'Open your portal to view it.'
    ];
    return mirrorCustomerSms(payload, smsLines).then(function () {
      return r;
    });
  });
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
      actionLabel: 'Review User Portal',
      actionUrl: portalUrlForEmail(payload, getBranding().paymentPortalUrl)
    })
  ).then(function (r) {
    var plain = String(payload.updateSummary || 'Account updated').replace(/\s+/g, ' ').trim();
    return mirrorCustomerSms(payload, ['Supple Automotive: ' + plain.slice(0, 220)]).then(function () {
      return r;
    });
  });
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
    'Service address: ' + (payload.service_address || ''),
    'Work location: ' + (formatWorkLocation(payload.work_location) || ''),
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
  ).then(function (r) {
    var sub = String(payload.subject || 'Message').slice(0, 100);
    var msg = String(payload.message || '').replace(/\s+/g, ' ').trim().slice(0, 320);
    return mirrorCustomerSms(payload, ['Supple Automotive: ' + sub, msg]).then(function () {
      return r;
    });
  });
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
