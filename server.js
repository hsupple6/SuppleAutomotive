/**
 * Supple Automotive — form submission API + Supabase
 * POST /api/submit-service-request → email/SMS + create customer/vehicle/service in DB
 * POST /api/payment-lookup → find customer by email, return balance + past services
 */
require('dotenv').config();
var path = require('path');
var fs = require('fs');
var buildInvoicePdfBuffer = require(path.join(__dirname, 'lib', 'invoice-pdf')).buildInvoicePdfBuffer;
var agreementPdf = require(path.join(__dirname, 'lib', 'agreement-pdf'));
var estimatePdf = require(path.join(__dirname, 'lib', 'estimate-pdf'));
var vehicleReleaseFields = require(path.join(__dirname, 'lib', 'vehicle-release-fields'));
var signedAgreementPdf = require(path.join(__dirname, 'lib', 'signed-agreement-pdf'));
var devPdfSamples = require(path.join(__dirname, 'lib', 'dev-pdf-samples'));
var emailNotifications = require(path.join(__dirname, 'lib', 'email-notifications'));
var googleReceiptTracker = require(path.join(__dirname, 'lib', 'google-receipt-tracker'));
var documentBuilder = require(path.join(__dirname, 'lib', 'document-builder'));
var invoiceNumberLib = require(path.join(__dirname, 'lib', 'invoice-number'));
var customerExportFiles = require(path.join(__dirname, 'lib', 'customer-export-files'));
var portalMagic = require(path.join(__dirname, 'lib', 'portal-magic'));
var express = require('express');
var session = require('express-session');
var multer = require('multer');
var app = express();

// Stripe webhook must receive raw body for signature verification (register before express.json())
var stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.warn('Stripe not available:', e.message);
  }
}
var stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), function (req, res) {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(503).send('Stripe not configured');
  }
  var sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing stripe-signature');
  var event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    console.warn('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).send();
  }
  var session = event.data.object;
  var customerId = session.metadata && session.metadata.customer_id;
  var amountTotal = session.amount_total; // cents
  if (!customerId || !amountTotal || amountTotal <= 0) {
    console.warn('Stripe webhook missing customer_id or amount_total in session');
    return res.status(200).send();
  }
  var amountDollars = Math.round(amountTotal) / 100;
  if (!supabase) return res.status(503).send('Database not configured');
  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) return Promise.reject(new Error('Account not ready'));
      return supabase.from('customers').select('id').eq('id', customerId).eq('account_id', accountId).single();
    })
    .then(function (cRes) {
      if (cRes.error || !cRes.data) return Promise.reject(new Error('Customer not found'));
      return supabase.from('services').select('id, created_at, service_price').eq('customer_id', customerId).eq('bill_status', 'posted').order('created_at', { ascending: true });
    })
    .then(function (sRes) {
      var services = sRes.data || [];
      if (services.length === 0) return Promise.resolve([]);
      var serviceIds = services.map(function (s) { return s.id; });
      return Promise.all([
        Promise.resolve(services),
        supabase.from('service_parts').select('service_id, total_price').in('service_id', serviceIds),
        supabase.from('service_payments').select('service_id, amount').in('service_id', serviceIds)
      ]);
    })
    .then(function (results) {
      var services = results[0];
      var partsRows = results[1].data || [];
      var payRows = results[2].data || [];
      var partsBySvc = {};
      partsRows.forEach(function (p) {
        partsBySvc[p.service_id] = (partsBySvc[p.service_id] || 0) + Number(p.total_price || 0);
      });
      var paidBySvc = {};
      payRows.forEach(function (p) {
        paidBySvc[p.service_id] = (paidBySvc[p.service_id] || 0) + Number(p.amount || 0);
      });
      var servicesWithBalance = services.map(function (svc) {
        var partsTotal = partsBySvc[svc.id] || 0;
        var total = Number(svc.service_price || 0) + partsTotal;
        var paid = paidBySvc[svc.id] || 0;
        var balance = Math.round((total - paid) * 100) / 100;
        return { id: svc.id, balance: balance };
      }).filter(function (s) { return s.balance > 0; });
      var remaining = amountDollars;
      var inserts = [];
      servicesWithBalance.forEach(function (s) {
        if (remaining <= 0) return;
        var apply = Math.min(remaining, s.balance);
        apply = Math.round(apply * 100) / 100;
        if (apply <= 0) return;
        inserts.push({ service_id: s.id, amount: apply, method: 'credit', notes: 'Stripe' });
        remaining = Math.round((remaining - apply) * 100) / 100;
      });
      if (inserts.length === 0) return res.status(200).send();
      return Promise.all(inserts.map(function (row) {
        return supabase.from('service_payments').insert(row);
      })).then(function () {
        return Promise.all(inserts.map(function (row) {
          return updateServicePaymentStatus(row.service_id);
        }));
      });
    })
    .then(function () {
      res.status(200).send();
    })
    .catch(function (err) {
      console.error('Stripe webhook error:', err.message || err);
      res.status(500).send('Webhook handler error');
    });
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

app.use(session({
  secret: process.env.SUPPLE_CONTROLS_SESSION_SECRET || 'supple-controls-secret-change-in-env',
  resave: false,
  saveUninitialized: false,
  name: 'supplecontrols'
}));

// If form posts to payment.html (e.g. JS didn't run), redirect back to the page
app.post('/payment.html', function (req, res) {
  res.redirect(302, '/payment.html');
});

// Controls panel: /supplecontrols — login with username/password from env
var controlsUsername = process.env.SUPPLE_CONTROLS_USERNAME || '';
var controlsPassword = process.env.SUPPLE_CONTROLS_PASSWORD || '';

function controlsAuth(req) {
  return req.session && req.session.controlsUser === true;
}

function sendControlsLogin(res, error) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Supple Controls — Sign in</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">' +
    '<style>body{font-family:Inter,sans-serif;background:#0d0d0d;color:#e5e5e5;min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;padding:1rem;} .box{background:#1a1a1a;border:1px solid #333;padding:2rem;width:100%;max-width:320px;} h1{font-size:1.25rem;margin:0 0 1.5rem;} label{display:block;font-size:0.8rem;margin-bottom:0.35rem;color:#999;} input{width:100%;padding:0.6rem;margin-bottom:1rem;background:#0d0d0d;border:1px solid #333;color:#e5e5e5;font:inherit;box-sizing:border-box;} .err{color:#c44;font-size:0.85rem;margin-bottom:1rem;} button{width:100%;padding:0.75rem;background:#e5e5e5;color:#0d0d0d;border:none;font:inherit;font-weight:600;cursor:pointer;} button:hover{opacity:0.9;}</style></head><body>' +
    '<div class="box">' +
    '<h1>Supple Controls</h1>' +
    (error ? '<p class="err">' + escapeHtmlControl(error) + '</p>' : '') +
    '<form method="post" action="/supplecontrols/login">' +
    '<label for="u">Username</label><input type="text" id="u" name="username" autocomplete="username" required>' +
    '<label for="p">Password</label><input type="password" id="p" name="password" autocomplete="current-password" required>' +
    '<button type="submit">Sign in</button>' +
    '</form></div></body></html>'
  );
}

function escapeHtmlControl(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

app.get('/supplecontrols', function (req, res) {
  if (controlsAuth(req)) return sendControlsPanel(res);
  sendControlsLogin(res);
});

app.get('/supplecontrols/estimate-builder', function (req, res) {
  if (!controlsAuth(req)) return sendControlsLogin(res);
  sendControlsView(res, 'supplecontrols-estimate-builder.html');
});

app.get('/supplecontrols/invoice-builder', function (req, res) {
  if (!controlsAuth(req)) return sendControlsLogin(res);
  sendControlsView(res, 'supplecontrols-invoice-builder.html');
});

app.post('/supplecontrols/login', function (req, res) {
  if (controlsAuth(req)) return res.redirect(302, '/supplecontrols');
  var username = (req.body && req.body.username || '').trim();
  var password = req.body && req.body.password;
  if (!controlsUsername || !controlsPassword) {
    return sendControlsLogin(res, 'Controls login is not configured.');
  }
  if (username !== controlsUsername || password !== controlsPassword) {
    return sendControlsLogin(res, 'Invalid username or password.');
  }
  req.session.controlsUser = true;
  res.redirect(302, '/supplecontrols');
});

app.post('/supplecontrols/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect(302, '/supplecontrols');
  });
});

// Controls panel: serve panel HTML when logged in (from views folder to avoid static exposure)
var viewsPath = path.join(__dirname, 'views');
function sendControlsView(res, filename) {
  var viewPath = path.join(viewsPath, filename || 'supplecontrols-panel.html');
  require('fs').exists(viewPath, function (exists) {
    if (exists) {
      res.sendFile(viewPath);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(
        '<!DOCTYPE html><html><head><title>Supple Controls</title></head><body>' +
        '<h1>Supple Controls</h1><p>View not found: ' + escapeHtmlControl(String(filename || '')) + '</p>' +
        '<a href="/supplecontrols/logout">Sign out</a></body></html>'
      );
    }
  });
}

function sendControlsPanel(res) {
  sendControlsView(res, 'supplecontrols-panel.html');
}

function customerFromEstimateBuilderBody(raw) {
  return documentBuilder.customerFromBuilderBody(raw);
}

function saveBuilderDocumentRow(accountId, body) {
  var parsed = documentBuilder.normalizeSavePayload(body);
  var documentType = String(body.documentType || 'estimate').toLowerCase();
  if (documentType !== 'estimate' && documentType !== 'invoice') {
    return Promise.reject(new Error('Invalid document type'));
  }
  if (!parsed.customer.name) return Promise.reject(new Error('Customer name is required'));
  var payload = {
    customer: parsed.customer,
    fields: parsed.fields,
    invoiceNumber: parsed.invoiceNumber || null
  };
  var row = {
    account_id: accountId,
    document_type: documentType,
    title: documentBuilder.buildSaveTitle(parsed.customer, parsed.fields),
    customer_name: parsed.customer.name,
    payload: payload,
    source_estimate_id: parsed.sourceEstimateId || null
  };
  var existingId = body.id ? String(body.id).trim() : '';
  if (existingId) {
    return supabase
      .from('builder_document_saves')
      .update(row)
      .eq('id', existingId)
      .eq('account_id', accountId)
      .select()
      .single();
  }
  return supabase.from('builder_document_saves').insert(row).select().single();
}

function devPdfSamplesEnabled() {
  var v = String(process.env.DEV_PDF_SAMPLES || process.env.ALLOW_DEV_PDF_SAMPLES || '').trim();
  return v === '1' || /^true$/i.test(v) || /^yes$/i.test(v);
}

function sendDevSamplePdf(res, buf, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', 'inline; filename="' + String(filename || 'sample.pdf').replace(/"/g, '') + '"');
  res.send(buf);
}

app.get('/api/dev/pdf-samples/check', function (req, res) {
  res.json({ enabled: devPdfSamplesEnabled() });
});

app.get('/api/dev/pdf-samples/agreement', function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  var cust = devPdfSamples.fillerCustomer();
  var veh = devPdfSamples.fillerVehicle();
  var fields = agreementPdf.normalizeAgreementReleaseFields(devPdfSamples.fillerAgreementFields());
  agreementPdf
    .buildAgreementPdfBuffer(cust, veh, { releaseFields: fields })
    .then(function (buf) {
      sendDevSamplePdf(res, buf, 'dev-agreement.pdf');
    })
    .catch(function (err) {
      console.error('dev pdf agreement:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

app.get('/api/dev/pdf-samples/agreement-typed', function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  var cust = devPdfSamples.fillerCustomer();
  var veh = devPdfSamples.fillerVehicle();
  var fields = agreementPdf.normalizeAgreementReleaseFields(devPdfSamples.fillerAgreementFields());
  agreementPdf
    .buildAgreementPdfBuffer(cust, veh, {
      releaseFields: fields,
      customerSignature: { mode: 'typed', payload: devPdfSamples.FILLER_DATE_TOKEN },
      signedDateStr: devPdfSamples.FILLER_DATE_TOKEN
    })
    .then(function (buf) {
      sendDevSamplePdf(res, buf, 'dev-agreement-typed.pdf');
    })
    .catch(function (err) {
      console.error('dev pdf agreement-typed:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

app.get('/api/dev/pdf-samples/agreement-drawn', function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  var cust = devPdfSamples.fillerCustomer();
  var veh = devPdfSamples.fillerVehicle();
  var fields = agreementPdf.normalizeAgreementReleaseFields(devPdfSamples.fillerAgreementFields());
  agreementPdf
    .buildAgreementPdfBuffer(cust, veh, {
      releaseFields: fields,
      customerSignature: { mode: 'drawn', payload: devPdfSamples.FILLER_DRAWN_SIG_PNG },
      signedDateStr: devPdfSamples.FILLER_DATE_TOKEN
    })
    .then(function (buf) {
      sendDevSamplePdf(res, buf, 'dev-agreement-drawn.pdf');
    })
    .catch(function (err) {
      console.error('dev pdf agreement-drawn:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

app.get('/api/dev/pdf-samples/agreement-bundle', function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  var cust = devPdfSamples.fillerCustomer();
  var veh = devPdfSamples.fillerVehicle();
  var fields = agreementPdf.normalizeAgreementReleaseFields(devPdfSamples.fillerAgreementFields());
  agreementPdf
    .buildAgreementPdfBuffer(cust, veh, { releaseFields: fields })
    .then(function (baseBuf) {
      return signedAgreementPdf.buildSignedAgreementPdf(baseBuf, {
        mode: 'typed',
        payload: devPdfSamples.FILLER_DATE_TOKEN,
        customerName: cust.name,
        signedAtLabel: devPdfSamples.FILLER_DATE_TOKEN + ' (UTC)'
      });
    })
    .then(function (outBytes) {
      sendDevSamplePdf(res, Buffer.from(outBytes), 'dev-agreement-signature-bundle.pdf');
    })
    .catch(function (err) {
      console.error('dev pdf agreement-bundle:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

app.get('/api/dev/pdf-samples/estimate', function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  var cust = devPdfSamples.fillerCustomer();
  var veh = devPdfSamples.fillerVehicle();
  var ef = estimatePdf.normalizeEstimateReleaseFields(devPdfSamples.fillerEstimateFields());
  estimatePdf
    .buildEstimatePdfBuffer(cust, veh, {
      releaseFields: ef,
      estimateId: '000001',
      documentDate: new Date('2025-01-03T12:00:00'),
      customerSignature: { mode: 'typed', payload: cust.name },
      signedDateStr: '1/3/2025',
      authMethod: 'in_person'
    })
    .then(function (buf) {
      sendDevSamplePdf(res, buf, 'dev-estimate.pdf');
    })
    .catch(function (err) {
      console.error('dev pdf estimate:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

app.get('/api/dev/pdf-samples/estimate-unsigned', function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  var cust = devPdfSamples.fillerCustomer();
  var veh = devPdfSamples.fillerVehicle();
  var ef = estimatePdf.normalizeEstimateReleaseFields(devPdfSamples.fillerEstimateFields());
  estimatePdf
    .buildEstimatePdfBuffer(cust, veh, {
      releaseFields: ef,
      estimateId: '000001',
      documentDate: new Date('2025-01-03T12:00:00')
    })
    .then(function (buf) {
      sendDevSamplePdf(res, buf, 'dev-estimate-unsigned.pdf');
    })
    .catch(function (err) {
      console.error('dev pdf estimate-unsigned:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

app.get('/api/dev/pdf-samples/invoice', function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  buildInvoicePdfBuffer(devPdfSamples.fillerInvoiceBundle())
    .then(function (buf) {
      sendDevSamplePdf(res, buf, 'dev-invoice.pdf');
    })
    .catch(function (err) {
      console.error('dev pdf invoice:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

// SEO: keyword URLs → same homepage (canonical in index.html points to /)
var seoLandingPaths = require(path.join(__dirname, 'lib', 'seo-landing-paths.js'));
var publicIndexHtml = path.join(__dirname, 'public', 'index.html');
var seoSeen = {};
seoLandingPaths.forEach(function (segment) {
  if (!segment || typeof segment !== 'string' || segment.indexOf('/') !== -1) return;
  if (seoSeen[segment]) return;
  seoSeen[segment] = true;
  app.get('/' + segment, function (req, res) {
    res.sendFile(publicIndexHtml);
  });
});

// Static files after /api routes so API paths are never ambiguous with public files
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.static(path.join(__dirname, 'public')));

var supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = require('@supabase/supabase-js').createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('Supabase connected (customers will be stored on service request)');
  } catch (e) {
    console.warn('Supabase not available:', e.message);
  }
} else {
  console.warn('Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to store customers');
}

function normalizePhone(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\D/g, '');
}

/** Last 10 digits only (no leading 1); used for storage and matching. */
function phoneLast10(str) {
  var digits = normalizePhone(str);
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}

/** Customers whose stored `phone` matches the given last-10 string after normalizing (ignores (), dashes, spaces, leading 1). */
function customersMatchingPhoneLast10(rows, phoneDigits10) {
  if (!phoneDigits10 || !rows || !rows.length) return [];
  return rows.filter(function (row) {
    return phoneLast10(String(row.phone || '')) === phoneDigits10;
  });
}

function normalizeNameCompare(submitted, stored) {
  function norm(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }
  return norm(submitted) === norm(stored);
}

function bundleSignatureLabel(bundleKey) {
  if (bundleKey === 'Starter') return 'Starter documentation';
  if (String(bundleKey || '').toLowerCase() === 'estimate') return 'Estimate';
  return String(bundleKey || '').replace(/[-_]/g, ' ');
}

function insertCustomerDocumentAndNotifyRelease(opts) {
  var row = opts.customerRow;
  var pdfUrl = String(opts.pdfUrl || '').trim();
  if (!row || !row.id || !pdfUrl) return Promise.resolve();
  var isEstimateBundle = !!opts.isEstimateBundle;
  var portalTitle = isEstimateBundle ? 'Estimate (awaiting signature)' : 'Agreement (awaiting signature)';
  return supabase
    .from('customer_documents')
    .insert({
      account_id: opts.accountId,
      customer_id: row.id,
      title: portalTitle,
      pdf_url: pdfUrl
    })
    .then(function (ins) {
      if (ins.error) {
        console.error('customer_documents insert on release:', ins.error.message || ins.error);
      }
      return trySend(function () {
        return emailNotifications.sendDocumentsAssignedAlert({
          email: row.email,
          customerId: row.id,
          phone: row.phone,
          contact_preference: row.contact_preference,
          documentTitle: isEstimateBundle ? 'Estimate' : 'Agreement',
          documentType: isEstimateBundle ? 'estimate' : 'agreement',
          documentUrl: pdfUrl,
          pdfBuffer: opts.pdfBuf,
          pdfFilename: opts.pdfFilename || (isEstimateBundle ? 'estimate.pdf' : 'agreement.pdf')
        });
      }, 'Documents assigned alert email failed');
    });
}

function fetchPendingSignatureBundlesForCustomer(customerId) {
  if (!supabase) return Promise.resolve([]);
  return supabase
    .from('customer_signature_bundles')
    .select('id, bundle_key, created_at')
    .eq('customer_id', customerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .then(function (bRes) {
      if (bRes.error) return [];
      var bundles = bRes.data || [];
      if (bundles.length === 0) return [];
      var ids = bundles.map(function (b) { return b.id; });
      return supabase
        .from('customer_signature_bundle_docs')
        .select('id, bundle_id, title, sort_order, pdf_url')
        .in('bundle_id', ids)
        .order('sort_order', { ascending: true })
        .then(function (dRes) {
          if (dRes.error) return [];
          var docs = dRes.data || [];
          var byBundle = {};
          docs.forEach(function (d) {
            if (!byBundle[d.bundle_id]) byBundle[d.bundle_id] = [];
            byBundle[d.bundle_id].push({ id: d.id, title: d.title, pdf_url: d.pdf_url || '' });
          });
          return bundles
            .map(function (b) {
              return {
                id: b.id,
                bundle_key: b.bundle_key,
                label: bundleSignatureLabel(b.bundle_key),
                documents: byBundle[b.id] || []
              };
            })
            .filter(function (x) { return x.documents.length > 0; });
        });
    });
}

/** Build the same JSON body as a successful payment-lookup (dashboard payload). */
function fetchPaymentDashboardPayload(customer) {
  var customerId = customer.id;
  var custDisplay = Object.assign({}, customer);
  if (custDisplay.phone) custDisplay.phone = phoneLast10(custDisplay.phone) || custDisplay.phone;
  var srvQ = supabase.from('services').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
  return srvQ.then(function (srvRes) {
    if (srvRes.error) return Promise.reject(new Error(srvRes.error.message || 'Services lookup failed'));
    var services = srvRes.data || [];
    var serviceIds = services.map(function (s) {
      return s.id;
    });
    if (serviceIds.length === 0) {
      return Promise.all([
        supabase
          .from('service_invoices')
          .select('id, service_id, invoice_number, pdf_url, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('customer_documents')
          .select('id, title, pdf_url, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
      ]).then(function (docRes) {
        var inv = docRes[0] && !docRes[0].error && docRes[0].data ? docRes[0].data : [];
        var docs = docRes[1] && !docRes[1].error && docRes[1].data ? docRes[1].data : [];
        return fetchPendingSignatureBundlesForCustomer(customerId).then(function (pendingSignatureBundles) {
          return {
            ok: true,
            customer: custDisplay,
            vehicles: [],
            services: [],
            balance: 0,
            invoices: inv,
            documents: docs,
            pendingSignatureBundles: pendingSignatureBundles
          };
        });
      });
    }
    return Promise.all([
      supabase.from('service_parts').select('*').in('service_id', serviceIds),
      supabase.from('service_payments').select('service_id, amount').in('service_id', serviceIds),
      supabase.from('service_images').select('*').in('service_id', serviceIds)
    ]).then(function (results) {
      var partsRes = results[0];
      var payRes = results[1];
      var imagesRes = results[2];
      var parts = partsRes.data || [];
      var payments = payRes.data || [];
      var images = imagesRes.data || [];
      var partsByService = {};
      parts.forEach(function (p) {
        if (!partsByService[p.service_id]) partsByService[p.service_id] = [];
        partsByService[p.service_id].push(p);
      });
      var paidByService = {};
      payments.forEach(function (p) {
        paidByService[p.service_id] = (paidByService[p.service_id] || 0) + Number(p.amount || 0);
      });
      var imagesByService = {};
      images.forEach(function (img) {
        if (!imagesByService[img.service_id]) imagesByService[img.service_id] = [];
        imagesByService[img.service_id].push(img);
      });
      var balance = 0;
      var servicesWithParts = services.map(function (s) {
        var serviceParts = partsByService[s.id] || [];
        var partsTotal = serviceParts.reduce(function (sum, p) {
          return sum + Number(p.total_price || 0);
        }, 0);
        var total = Number(s.service_price || 0) + partsTotal;
        var paidTotal = paidByService[s.id] || 0;
        var serviceBalance = Math.round((total - paidTotal) * 100) / 100;
        var isPosted = (s.bill_status || 'posted') === 'posted';
        if (isPosted && serviceBalance > 0) balance += serviceBalance;
        var paymentStatus = serviceBalance <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'unpaid';
        return Object.assign({}, s, {
          parts: serviceParts,
          images: imagesByService[s.id] || [],
          total: total,
          payment_status: paymentStatus,
          bill_status: s.bill_status || 'posted'
        });
      });
      return supabase
        .from('vehicles')
        .select('*')
        .eq('customer_id', customerId)
        .then(function (vRes) {
          return Promise.all([
            supabase
              .from('service_invoices')
              .select('id, service_id, invoice_number, pdf_url, created_at')
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false }),
            supabase
              .from('customer_documents')
              .select('id, title, pdf_url, created_at')
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false })
          ]).then(function (docRes) {
            var inv = docRes[0] && !docRes[0].error && docRes[0].data ? docRes[0].data : [];
            var docs = docRes[1] && !docRes[1].error && docRes[1].data ? docRes[1].data : [];
            return fetchPendingSignatureBundlesForCustomer(customerId).then(function (pendingSignatureBundles) {
              return {
                ok: true,
                customer: custDisplay,
                vehicles: vRes.data || [],
                services: servicesWithParts,
                balance: Math.round(balance * 100) / 100,
                invoices: inv,
                documents: docs,
                pendingSignatureBundles: pendingSignatureBundles
              };
            });
          });
        });
    });
  });
}

function verifyPaymentBodyCustomer(body, customer) {
  var name = (body.name || '').trim();
  var email = (body.email || '').trim();
  var phone = phoneLast10((body.phone || '').trim());
  if (!name || !normalizeNameCompare(name, customer.name)) return false;
  if (email) return String(customer.email || '').trim().toLowerCase() === email.toLowerCase();
  if (phone) return phoneLast10(customer.phone || '') === phone;
  return false;
}

function getOrCreateShopAccount() {
  if (!supabase) return Promise.reject(new Error('Database not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)'));
  return supabase.from('accounts').select('id').eq('slug', 'supple-automotive').maybeSingle()
    .then(function (acc) {
      if (acc.error) return Promise.reject(new Error(acc.error.message || 'Account lookup failed'));
      if (acc.data && acc.data.id) return acc.data.id;
      return supabase.from('accounts').insert({
        name: 'Supple Automotive',
        slug: 'supple-automotive'
      }).select('id').single().then(function (r) {
        if (r.error) return Promise.reject(new Error(r.error.message || 'Account create failed'));
        return r.data ? r.data.id : null;
      });
    });
}

function formatFormBody(data) {
  var lines = [];
    var labels = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    service_address: 'Service address',
    work_location: 'Work location',
    vehicle_year: 'Vehicle year',
    vehicle_make: 'Make',
    vehicle_model: 'Model',
    service_type: 'Service needed',
    details: 'Details',
    preferred_date: 'Preferred date',
    preferred_time: 'Preferred time',
    notes: 'Additional notes'
  };
  var workLocationLabels = {
    garage: 'Garage',
    driveway: 'Driveway',
    lot: 'Lot',
    street: 'Street',
    other: 'Other'
  };
  Object.keys(labels).forEach(function (key) {
    var val = data[key];
    if (val != null && String(val).trim() !== '') {
      if (key === 'work_location') {
        var wl = String(val).trim().toLowerCase();
        val = workLocationLabels[wl] || val;
      }
      lines.push(labels[key] + ': ' + String(val).trim());
    }
  });
  return lines.join('\n');
}

function formatSmsBody(data) {
  var text = formatFormBody(data);
  if (text.length > 1500) text = text.slice(0, 1497) + '…';
  return 'Service request:\n' + text;
}

function trySend(promiseFactory, label) {
  try {
    return Promise.resolve()
      .then(promiseFactory)
      .catch(function (err) {
        console.warn(label + ':', err && err.message ? err.message : err);
      });
  } catch (err) {
    console.warn(label + ':', err && err.message ? err.message : err);
    return Promise.resolve();
  }
}

function sendAccountUpdateByCustomerId(customerId, updateSummary) {
  if (!customerId) return Promise.resolve();
  return supabase
    .from('customers')
    .select('id, email, phone, contact_preference')
    .eq('id', customerId)
    .maybeSingle()
    .then(function (cRes) {
      var row = cRes && cRes.data ? cRes.data : null;
      var customerEmail = row ? row.email : '';
      return trySend(function () {
        return emailNotifications.sendAccountUpdatedAlert({
          email: customerEmail,
          customerId: customerId,
          phone: row && row.phone,
          contact_preference: row && row.contact_preference,
          updateSummary: updateSummary
        });
      }, 'Account update email failed');
    });
}

app.post('/api/submit-service-request', function (req, res) {
  function sendError(status, message) {
    res.status(status).json({ ok: false, error: message });
  }

  try {
    var body = req.body || {};

    var formData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      contact_preference: String(body.contact_preference || 'email').toLowerCase() === 'sms' ? 'sms' : 'email',
      contact_via_ok: !!body.contact_via_ok,
      service_address: body.service_address,
      work_location: body.work_location,
      vehicle_year: body.vehicle_year,
      vehicle_make: body.vehicle_make,
      vehicle_model: body.vehicle_model,
      service_type: body.service_type,
      details: body.details,
      preferred_date: body.preferred_date,
      preferred_time: body.preferred_time,
      notes: body.notes
    };

    if (!formData.name || !String(formData.name).trim()) {
      return sendError(400, 'Name is required');
    }
    if (!formData.email || !String(formData.email).trim()) {
      return sendError(400, 'Email is required');
    }
    if (!formData.service_address || !String(formData.service_address).trim()) {
      return sendError(400, 'Service address is required');
    }
    if (!formData.contact_via_ok) {
      return sendError(400, 'Please confirm contact permission');
    }
    if (formData.contact_preference === 'sms' && (!formData.phone || String(formData.phone).trim().length < 10)) {
      return sendError(400, 'Phone number must be at least 10 characters when SMS is selected');
    }

    var ownerEmail = (process.env.OWNER_EMAIL || process.env.EMAIL_OWNER_ALERT || process.env.EMAIL_SIGNATURE_EMAIL || process.env.RESEND_FROM_EMAIL || '').trim();

    var dbPromise;
    if (!supabase) {
      dbPromise = Promise.reject(new Error('Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'));
    } else {
      dbPromise = (function () {
        var name = (formData.name || '').trim();
        var email = (formData.email || '').trim();
        var phoneRaw = (formData.phone || '').trim();
        var phone = phoneLast10(phoneRaw) || null;
        if (!name) {
          console.warn('Submit: skipped DB (no name)');
          return Promise.resolve(null);
        }

        return getOrCreateShopAccount().then(function (accountId) {
          if (!accountId) return Promise.reject(new Error('Could not get or create shop account'));
          var query = supabase.from('customers').select('id').eq('account_id', accountId);
          if (email) query = query.eq('email', email);
          else if (phone) query = query.eq('phone', phone);
          else {
            return supabase
              .from('customers')
              .insert({
                account_id: accountId,
                name: name,
                contact_preference: String(formData.contact_preference || 'email').toLowerCase() === 'sms' ? 'sms' : 'email'
              })
              .select('id')
              .single()
              .then(function (r) {
                if (r.error) return Promise.reject(new Error(r.error.message || 'Customer insert failed'));
                if (r.data && r.data.id) {
                  console.log('Customer created (name only):', r.data.id, 'for account', accountId);
                  return { accountId: accountId, customerId: r.data.id, vehicleId: null };
                }
                return null;
              });
          }
          return query.maybeSingle().then(function (cust) {
            if (cust.error) return Promise.reject(new Error(cust.error.message || 'Customer lookup failed'));
            if (cust.data) {
              var pref = String(formData.contact_preference || 'email').toLowerCase() === 'sms' ? 'sms' : 'email';
              return supabase
                .from('customers')
                .update({
                  contact_preference: pref,
                  phone: phone || cust.data.phone,
                  name: name
                })
                .eq('id', cust.data.id)
                .then(function (ur) {
                  if (ur.error) return Promise.reject(new Error(ur.error.message || 'Customer update failed'));
                  return { accountId: accountId, customerId: cust.data.id, vehicleId: null };
                });
            }
            return supabase.from('customers').insert({
              account_id: accountId,
              name: name,
              email: email || null,
              phone: phone || null,
              contact_preference: String(formData.contact_preference || 'email').toLowerCase() === 'sms' ? 'sms' : 'email'
            }).select('id').single().then(function (r) {
              if (r.error) return Promise.reject(new Error(r.error.message || 'Customer insert failed'));
              if (r.data && r.data.id) {
                console.log('Customer created:', r.data.id, 'for account', accountId);
                return { accountId: accountId, customerId: r.data.id, vehicleId: null };
              }
              return null;
            });
          });
        })
          .then(function (ctx) {
            if (!ctx) return null;
            var vy = (formData.vehicle_year || '').trim();
            var vk = (formData.vehicle_make || '').trim();
            var vm = (formData.vehicle_model || '').trim();
            if (vy && vk && vm) {
              return supabase.from('vehicles').insert({
                account_id: ctx.accountId,
                customer_id: ctx.customerId,
                year: parseInt(vy, 10) || null,
                make: vk,
                model: vm
              }).select('id').single().then(function (v) {
                if (v.error) return Promise.reject(new Error(v.error.message || 'Vehicle insert failed'));
                return v.data ? { accountId: ctx.accountId, customerId: ctx.customerId, vehicleId: v.data.id } : ctx;
              });
            }
            return ctx;
          })
          .then(function (ctx) {
            if (!ctx) return;
            return supabase.from('services').insert({
              account_id: ctx.accountId,
              customer_id: ctx.customerId,
              vehicle_id: ctx.vehicleId,
              status: 'draft',
              payment_status: 'unpaid',
              service_name: formData.service_type || 'Service request',
              service_price: 0,
              notes: (function () {
                var wl = String(formData.work_location || '').trim().toLowerCase();
                var wlLabels = { garage: 'Garage', driveway: 'Driveway', lot: 'Lot', street: 'Street', other: 'Other' };
                var wlLine = wl && wlLabels[wl] ? 'Work location: ' + wlLabels[wl] : (formData.work_location ? 'Work location: ' + formData.work_location : '');
                var addrLine = (formData.service_address && String(formData.service_address).trim()) ? 'Service address: ' + String(formData.service_address).trim() : '';
                return [addrLine, wlLine, formData.details, formData.notes].filter(Boolean).join('\n') || null;
              })()
            }).then(function (r) {
              if (r && r.error) return Promise.reject(new Error(r.error.message || 'Service insert failed'));
              return { customerId: ctx.customerId };
            });
          });
      })();
    }

    dbPromise
      .then(function (ctxAfterDb) {
        var enrich = Object.assign({}, formData);
        if (ctxAfterDb && ctxAfterDb.customerId) enrich.customerId = ctxAfterDb.customerId;
        return Promise.all([
          trySend(function () {
            if (!ownerEmail) {
              console.warn(
                'Service request: no owner inbox configured. Set OWNER_EMAIL (or EMAIL_OWNER_ALERT) in .env to receive new inquiry emails.'
              );
              return Promise.resolve({ skipped: true, reason: 'missing-owner-email' });
            }
            return emailNotifications.sendOwnerServiceRequestAlert(
              Object.assign({}, formData, { ownerEmail: ownerEmail })
            );
          }, 'Owner service-request email failed'),
          trySend(function () {
            return emailNotifications.sendServiceRequestConfirmation(enrich);
          }, 'Customer confirmation email failed')
        ]);
      })
      .then(function () {
        res.json({ ok: true });
      })
      .catch(function (err) {
        console.error('Submit error:', err.message || err);
        sendError(500, err.message || 'Send failed');
      });
  } catch (err) {
    console.error('Submit error (sync):', err.message || err);
    sendError(500, err.message || 'Server error');
  }
});

app.post('/api/payment-lookup', function (req, res) {
  function sendError(status, message) {
    res.status(status).json({ ok: false, error: message });
  }

  if (!supabase) {
    return sendError(503, 'Database not configured');
  }

  var body = req.body || {};
  var email = (body.email || '').trim();

  if (!email) {
    return sendError(400, 'Email is required');
  }

  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) return Promise.reject(new Error('Database not ready'));
      return supabase
        .from('customers')
        .select('*')
        .eq('account_id', accountId)
        .eq('email', email)
        .maybeSingle()
        .then(function (c) {
          if (!c.data) {
            return Promise.reject(new Error('No customer found for that email. Submit a service request first to create your account.'));
          }
          return { accountId: accountId, customer: c.data };
        });
    })
    .then(function (_) {
      return fetchPaymentDashboardPayload(_.customer).then(function (payload) {
        res.json(payload);
      });
    })
    .catch(function (err) {
      console.error('Payment lookup error:', err.message || err);
      var isNotFound = err.message && err.message.indexOf('No customer found') === 0;
      sendError(isNotFound ? 404 : 500, err.message || 'Lookup failed');
    });
});

/** One-tap portal: magic link in SMS opens payment page logged in as this customer. */
app.post('/api/portal-bootstrap', function (req, res) {
  function sendError(status, message) {
    res.status(status).json({ ok: false, error: message });
  }
  if (!supabase) return sendError(503, 'Database not configured');
  var body = req.body || {};
  var token = String(body.p || body.token || '').trim();
  if (!token) return sendError(400, 'Missing token');
  var customerId = portalMagic.verifyPortalToken(token);
  if (!customerId) return sendError(401, 'Invalid or expired link');
  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) return Promise.reject(new Error('Database not ready'));
      return supabase.from('customers').select('*').eq('id', customerId).eq('account_id', accountId).maybeSingle();
    })
    .then(function (cRes) {
      if (cRes.error) return sendError(500, cRes.error.message || 'Lookup failed');
      if (!cRes.data) return sendError(404, 'Account not found');
      return fetchPaymentDashboardPayload(cRes.data);
    })
    .then(function (payload) {
      res.json(payload);
    })
    .catch(function (err) {
      console.error('portal-bootstrap:', err.message || err);
      sendError(500, err.message || 'Server error');
    });
});

app.post('/api/signable-pdf', function (req, res) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  var body = req.body || {};
  var documentId = String(body.documentId || '').trim();
  if (!documentId) return res.status(400).json({ error: 'documentId required' });
  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) throw new Error('Account not ready');
      return supabase.from('customer_signature_bundle_docs').select('id, pdf_url, bundle_id').eq('id', documentId).maybeSingle()
        .then(function (dr) {
          if (dr.error || !dr.data) {
            var e = new Error('Not found');
            e.status = 404;
            throw e;
          }
          var row = dr.data;
          return supabase.from('customer_signature_bundles').select('id, customer_id, status, account_id').eq('id', row.bundle_id).eq('account_id', accountId).maybeSingle()
            .then(function (br) {
              if (br.error || !br.data || br.data.status !== 'pending') {
                var e2 = new Error('Not found');
                e2.status = 404;
                throw e2;
              }
              return supabase.from('customers').select('*').eq('id', br.data.customer_id).single().then(function (cr) {
                if (cr.error || !cr.data) {
                  var e3 = new Error('Not found');
                  e3.status = 404;
                  throw e3;
                }
                if (!verifyPaymentBodyCustomer(body, cr.data)) {
                  var e4 = new Error('Unauthorized');
                  e4.status = 403;
                  throw e4;
                }
                return row.pdf_url;
              });
            });
        });
    })
    .then(function (pdfUrl) {
      return fetch(pdfUrl).then(function (r) {
        if (!r.ok) throw new Error('PDF unavailable');
        return r.arrayBuffer();
      });
    })
    .then(function (ab) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(Buffer.from(ab));
    })
    .catch(function (err) {
      var st = err.status || 500;
      if (st !== 403 && st !== 404) st = 500;
      if (st === 500) console.error('signable-pdf:', err.message || err);
      res.status(st).json({ error: err.message || 'Failed' });
    });
});

function finalizeSignedAgreementPdf(accountId, customerId, bundleId, bundleKey, customerName, mode, payloadStr) {
  if (!supabase) return Promise.resolve();
  var signedAtLabel = new Date().toISOString();
  var dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return Promise.all([
    supabase
      .from('customer_signature_bundle_docs')
      .select('pdf_url')
      .eq('bundle_id', bundleId)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from('customer_signature_bundles').select('release_fields').eq('id', bundleId).maybeSingle(),
    supabase.from('customers').select('*').eq('id', customerId).single(),
    supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
  ])
    .then(function (rows) {
      var dr = rows[0];
      var br = rows[1];
      var cr = rows[2];
      var vr = rows[3];
      var pdfUrl = dr.data && dr.data.pdf_url;
      if (!pdfUrl || cr.error || !cr.data) return;
      var rf = (br.data && br.data.release_fields) || {};
      var isEstimateBundle = String(bundleKey || '').toLowerCase() === 'estimate';
      var missing = isEstimateBundle
        ? estimatePdf.validateEstimateReleaseFieldsComplete(rf)
        : agreementPdf.validateAgreementReleaseFieldsComplete(rf);
      var buildSignedBuf = function (baseBuf) {
        return signedAgreementPdf
          .buildSignedAgreementPdf(baseBuf, {
            mode: mode,
            payload: payloadStr,
            customerName: customerName,
            signedAtLabel: signedAtLabel
          })
          .then(function (uint8) {
            return Buffer.from(uint8);
          });
      };
      var uploadSigned = function (buf) {
        var pathKey = 'signed-agreements/' + customerId + '/' + bundleId + '-' + Date.now() + '.pdf';
        return supabase.storage
          .from('invoices')
          .upload(pathKey, buf, { contentType: 'application/pdf', upsert: false })
          .then(function (up) {
            if (up.error) {
              console.error('Signed PDF upload:', up.error.message);
              return null;
            }
            var pub = supabase.storage.from('invoices').getPublicUrl(pathKey);
            var url = pub && pub.data && pub.data.publicUrl;
            if (!url) return null;
            return supabase
              .from('customer_signature_bundles')
              .update({ signed_pdf_url: url })
              .eq('id', bundleId)
              .then(function () {
                return supabase.from('customer_documents').insert({
                  account_id: accountId,
                  customer_id: customerId,
                  title:
                    (isEstimateBundle ? 'Signed estimate (' : 'Signed agreement (') +
                    String(bundleKey || 'packet') +
                    ')',
                  pdf_url: url
                });
              })
              .then(function (ins) {
                if (ins.error) {
                  console.error('customer_documents insert after sign:', ins.error.message || ins.error);
                }
                return { url: url, pdfBuffer: buf };
              });
          });
      };
      if (missing.length === 0) {
        var dbVeh = vr.data && !vr.error ? vr.data : null;
        var resolvedVeh = isEstimateBundle
          ? estimatePdf.resolveVehicleForDocument(rf, dbVeh)
          : dbVeh;
        var builder = isEstimateBundle ? estimatePdf.buildEstimatePdfBuffer : agreementPdf.buildAgreementPdfBuffer;
        return builder(cr.data, resolvedVeh, {
            releaseFields: rf,
            customerSignature: { mode: mode, payload: payloadStr },
            signedDateStr: dateLabel,
            authMethod: isEstimateBundle ? 'email' : undefined,
            authTimeStr: isEstimateBundle ? new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : undefined,
            authEmailStr: isEstimateBundle ? String(cr.data.email || '').trim() : undefined,
            authPhoneStr: isEstimateBundle ? String(cr.data.phone || '').trim() : undefined
          })
          .then(buildSignedBuf)
          .then(uploadSigned);
      }
      return fetch(pdfUrl)
        .then(function (r) {
          if (!r.ok) throw new Error('Could not fetch signed source PDF');
          return r.arrayBuffer();
        })
        .then(function (ab) {
          return buildSignedBuf(Buffer.from(ab));
        })
        .then(uploadSigned);
    })
    .catch(function (e) {
      console.error('finalizeSignedAgreementPdf:', e.message || e);
    });
}

app.post('/api/complete-signature-bundle', function (req, res) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  var body = req.body || {};
  var bundleId = String(body.bundleId || '').trim();
  var mode = String(body.signatureMode || '').toLowerCase();
  var payload = body.signaturePayload;
  if (!bundleId || (mode !== 'typed' && mode !== 'drawn')) {
    return res.status(400).json({ error: 'bundleId and signatureMode (typed|drawn) required' });
  }
  if (mode === 'typed' && (!payload || String(payload).trim().length < 2)) {
    return res.status(400).json({ error: 'Please type your full name' });
  }
  if (mode === 'drawn' && (!payload || String(payload).length < 80)) {
    return res.status(400).json({ error: 'Please draw your signature' });
  }
  var payloadStr = typeof payload === 'string' ? payload : String(payload);
  if (payloadStr.length > 1200000) return res.status(400).json({ error: 'Payload too large' });
  var accountIdForSign = null;
  var customerIdForSign = null;
  var bundleKeyForSign = null;
  var customerNameForSign = '';
  var customerEmailForSign = '';
  var customerNotifyRow = null;
  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) throw new Error('Account not ready');
      accountIdForSign = accountId;
      return supabase.from('customer_signature_bundles').select('*').eq('id', bundleId).eq('account_id', accountId).maybeSingle()
        .then(function (br) {
          if (br.error || !br.data || br.data.status !== 'pending') {
            var e = new Error('Not found');
            e.status = 404;
            throw e;
          }
          customerIdForSign = br.data.customer_id;
          bundleKeyForSign = br.data.bundle_key;
          return supabase.from('customers').select('*').eq('id', br.data.customer_id).single().then(function (cr) {
            if (cr.error || !cr.data) {
              var e2 = new Error('Not found');
              e2.status = 404;
              throw e2;
            }
            if (!verifyPaymentBodyCustomer(body, cr.data)) {
              var e3 = new Error('Unauthorized');
              e3.status = 403;
              throw e3;
            }
            customerNameForSign = cr.data.name || '';
            customerEmailForSign = cr.data.email || '';
            customerNotifyRow = cr.data;
            return supabase.from('customer_signature_bundles').update({
              status: 'completed',
              signature_mode: mode,
              signature_payload: payloadStr,
              signed_at: new Date().toISOString()
            }).eq('id', bundleId).eq('status', 'pending').select('id').maybeSingle();
          });
        });
    })
    .then(function (up) {
      if (up.error) throw new Error(up.error.message);
      if (!up.data) {
        var e = new Error('Already completed or invalid');
        e.status = 409;
        throw e;
      }
      return finalizeSignedAgreementPdf(
        accountIdForSign,
        customerIdForSign,
        bundleId,
        bundleKeyForSign,
        customerNameForSign,
        mode,
        payloadStr
      ).then(function (signedResult) {
        trySend(function () {
          return emailNotifications.sendSignedDocumentAlert({
            email: customerEmailForSign,
            customerId: customerIdForSign,
            phone: customerNotifyRow && customerNotifyRow.phone,
            contact_preference: customerNotifyRow && customerNotifyRow.contact_preference,
            documentType: String(bundleKeyForSign || '').toLowerCase() === 'estimate' ? 'estimate' : 'agreement',
            documentUrl: (signedResult && signedResult.url) || '',
            pdfBuffer: signedResult && signedResult.pdfBuffer,
            pdfFilename:
              String(bundleKeyForSign || '').toLowerCase() === 'estimate'
                ? 'signed-estimate.pdf'
                : 'signed-agreement.pdf'
          });
        }, 'Signed document email failed');
        res.json({ ok: true, signedPdfUrl: signedResult && signedResult.url ? signedResult.url : null });
      });
    })
    .catch(function (err) {
      var st = err.status || 500;
      if (st !== 403 && st !== 404 && st !== 409) st = 500;
      if (st === 500) console.error('complete-signature-bundle:', err.message || err);
      res.status(st).json({ error: err.message || 'Failed' });
    });
});

// Create Stripe Checkout Session for Pay Now (redirect to Stripe, then back to payment page)
app.post('/api/create-checkout-session', function (req, res) {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  var body = req.body || {};
  var customerId = (body.customerId || body.customer_id || '').trim();
  var amount = parseFloat(body.amount);
  if (!customerId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'customerId and amount (greater than 0) are required' });
  }
  var amountCents = Math.round(amount * 100);
  if (amountCents < 50) {
    return res.status(400).json({ error: 'Minimum payment is $0.50' });
  }
  var baseUrl = (body.baseUrl || req.protocol + '://' + req.get('host') || '').replace(/\/$/, '');
  var successUrl = baseUrl ? baseUrl + '/payment.html?paid=1' : '/payment.html?paid=1';
  var cancelUrl = baseUrl ? baseUrl + '/payment.html' : '/payment.html';

  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) return Promise.reject(new Error('Account not ready'));
      return supabase.from('customers').select('id, name').eq('id', customerId).eq('account_id', accountId).single();
    })
    .then(function (cRes) {
      if (cRes.error || !cRes.data) return Promise.reject(new Error('Customer not found'));
      return stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: 'Supple Automotive — Balance payment',
              description: 'Payment toward your service balance'
            }
          },
          quantity: 1
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { customer_id: customerId }
      });
    })
    .then(function (session) {
      res.json({ url: session.url });
    })
    .catch(function (err) {
      console.error('Create checkout session error:', err.message || err);
      res.status(500).json({ error: err.message || 'Could not create checkout session' });
    });
});

// ========== Reviews (public: list + submit) ==========
app.get('/api/reviews', function (req, res) {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) return Promise.reject(new Error('Account not ready'));
      return supabase.from('reviews').select('id, name, body, rating, created_at').eq('account_id', accountId).order('created_at', { ascending: false });
    })
    .then(function (r) {
      if (r.error) return Promise.reject(new Error(r.error.message));
      res.json({ reviews: r.data || [] });
    })
    .catch(function (err) {
      console.error('Reviews list error:', err.message || err);
      res.status(500).json({ error: err.message || 'Could not load reviews' });
    });
});

app.post('/api/reviews', function (req, res) {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured' });
  }
  var body = req.body || {};
  var name = (body.name || '').trim();
  var reviewBody = (body.body || body.review || '').trim();
  var rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!reviewBody) return res.status(400).json({ error: 'Review text is required' });
  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) return Promise.reject(new Error('Account not ready'));
      return supabase.from('reviews').insert({ account_id: accountId, name: name, body: reviewBody, rating: rating }).select('id, name, body, rating, created_at').single();
    })
    .then(function (r) {
      if (r.error) return Promise.reject(new Error(r.error.message));
      res.status(201).json(r.data);
    })
    .catch(function (err) {
      console.error('Review submit error:', err.message || err);
      res.status(500).json({ error: err.message || 'Could not save review' });
    });
});

// ========== Controls panel API (require auth + Supabase) ==========
function controlsApiAuth(req, res, next) {
  if (!controlsAuth(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function controlsJson(err, res, data) {
  if (err) {
    console.error('Controls API:', err.message || err);
    res.status(500).json({ error: err.message || 'Server error' });
    return;
  }
  res.json(data);
}

function getAccountThen(req, res, fn) {
  if (!supabase) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }
  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) {
        res.status(503).json({ error: 'Account not ready' });
        return;
      }
      fn(accountId);
    })
    .catch(function (err) {
      controlsJson(err, res);
    });
}

app.get('/supplecontrols/api/email-template', controlsApiAuth, function (req, res) {
  try {
    res.json({ template: emailNotifications.getEmailTemplate() });
  } catch (err) {
    controlsJson(err, res);
  }
});

app.put('/supplecontrols/api/email-template', controlsApiAuth, function (req, res) {
  try {
    var body = req.body || {};
    var template = body.template;
    if (typeof template !== 'string') return res.status(400).json({ error: 'template is required' });
    var saved = emailNotifications.saveEmailTemplate(template);
    res.json({ ok: true, template: saved });
  } catch (err) {
    controlsJson(err, res);
  }
});

app.post('/supplecontrols/api/customers/:id/send-email', controlsApiAuth, function (req, res) {
  var customerId = req.params.id;
  var body = req.body || {};
  var subject = String(body.subject || '').trim();
  var message = String(body.message || '').trim();
  if (!subject) return res.status(400).json({ error: 'Subject is required' });
  if (!message) return res.status(400).json({ error: 'Message is required' });

  getAccountThen(req, res, function (accountId) {
    supabase
      .from('customers')
      .select('id, name, email, phone, contact_preference')
      .eq('id', customerId)
      .eq('account_id', accountId)
      .single()
      .then(function (cRes) {
        if (cRes.error || !cRes.data) return res.status(404).json({ error: 'Customer not found' });
        var customer = cRes.data;
        if (!customer.email) return res.status(400).json({ error: 'Customer has no email on file' });
        return emailNotifications.sendManualCustomerEmail({
          email: customer.email,
          customerId: customer.id,
          phone: customer.phone,
          contact_preference: customer.contact_preference,
          subject: subject,
          message: message,
          heading: subject,
          intro: 'Hello ' + (customer.name || 'there') + ','
        }).then(function () {
          res.json({ ok: true });
        });
      })
      .catch(function (err) {
        controlsJson(err, res);
      });
  });
});

// List customers (search by name/email/phone), sort by updated_at desc
app.get('/supplecontrols/api/customers', controlsApiAuth, function (req, res) {
  getAccountThen(req, res, function (accountId) {
    var q = (req.query && req.query.q) ? String(req.query.q).trim().toLowerCase() : '';
    supabase.from('customers').select('id, name, email, phone, updated_at').eq('account_id', accountId).order('updated_at', { ascending: false }).then(function (r) {
      if (r.error) return controlsJson(new Error(r.error.message), res);
      var customers = (r.data || []).filter(function (c) {
        if (!q) return true;
        var name = (c.name || '').toLowerCase();
        var email = (c.email || '').toLowerCase();
        var phone = (c.phone || '').toLowerCase();
        return name.indexOf(q) !== -1 || email.indexOf(q) !== -1 || phone.indexOf(q) !== -1;
      });
      if (customers.length === 0) return res.json({ customers: [] });
      var customerIds = customers.map(function (c) { return c.id; });
      supabase.from('vehicles').select('id, customer_id, year, make, model').in('customer_id', customerIds).then(function (vRes) {
        var vehicles = vRes.data || [];
        var byCustomer = {};
        vehicles.forEach(function (v) {
          if (!byCustomer[v.customer_id]) byCustomer[v.customer_id] = [];
          byCustomer[v.customer_id].push(v);
        });
        customers.forEach(function (c) {
          var first = (byCustomer[c.id] || [])[0];
          c.car = first ? [first.year, first.make, first.model].filter(Boolean).join(' ') : null;
        });
        res.json({ customers: customers });
      });
    }).catch(function (err) { controlsJson(err, res); });
  });
});

function fetchCustomerPortalPdfs(customerId) {
  return Promise.all([
    supabase
      .from('service_invoices')
      .select('id, service_id, invoice_number, pdf_url, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('customer_documents')
      .select('id, title, pdf_url, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
  ]).then(function (rr) {
    return {
      invoices: rr[0].error ? [] : rr[0].data || [],
      documents: rr[1].error ? [] : rr[1].data || []
    };
  });
}

// Get one customer full (vehicles, services with parts + payments, contacts, portal PDFs)
app.get('/supplecontrols/api/customers/:id', controlsApiAuth, function (req, res) {
  var customerId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('account_id', accountId)
      .single()
      .then(function (cRes) {
        if (cRes.error || !cRes.data) return res.status(404).json({ error: 'Customer not found' });
        var customer = cRes.data;
        Promise.all([
          supabase.from('vehicles').select('*').eq('customer_id', customerId).order('created_at', { ascending: true }),
          supabase.from('customer_contacts').select('*').eq('customer_id', customerId)
        ]).then(function (results) {
          var vehicles = results[0].data || [];
          var contacts = results[1].data || [];
          supabase
            .from('services')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })
            .then(function (sRes) {
              var services = sRes.data || [];
              function respond(servicesPayload) {
                fetchCustomerPortalPdfs(customerId).then(function (pdfs) {
                  res.json({
                    customer: customer,
                    vehicles: vehicles,
                    contacts: contacts,
                    services: servicesPayload,
                    invoices: pdfs.invoices,
                    documents: pdfs.documents
                  });
                });
              }
              if (services.length === 0) {
                return respond([]);
              }
              var serviceIds = services.map(function (s) {
                return s.id;
              });
              Promise.all([
                supabase.from('service_parts').select('*').in('service_id', serviceIds),
                supabase.from('service_payments').select('*').in('service_id', serviceIds),
                supabase.from('service_images').select('*').in('service_id', serviceIds)
              ]).then(function (partsPaymentsImages) {
                var parts = partsPaymentsImages[0].data || [];
                var payments = partsPaymentsImages[1].data || [];
                var images = partsPaymentsImages[2].data || [];
                var partsBySvc = {};
                parts.forEach(function (p) {
                  if (!partsBySvc[p.service_id]) partsBySvc[p.service_id] = [];
                  partsBySvc[p.service_id].push(p);
                });
                var paymentsBySvc = {};
                payments.forEach(function (p) {
                  if (!paymentsBySvc[p.service_id]) paymentsBySvc[p.service_id] = [];
                  paymentsBySvc[p.service_id].push(p);
                });
                var imagesBySvc = {};
                images.forEach(function (img) {
                  if (!imagesBySvc[img.service_id]) imagesBySvc[img.service_id] = [];
                  imagesBySvc[img.service_id].push(img);
                });
                var servicesWithExtra = services.map(function (s) {
                  var serviceParts = partsBySvc[s.id] || [];
                  var partsTotal = serviceParts.reduce(function (sum, p) {
                    return sum + Number(p.total_price || 0);
                  }, 0);
                  var total = Number(s.service_price || 0) + partsTotal;
                  var paidTotal = (paymentsBySvc[s.id] || []).reduce(function (sum, p) {
                    return sum + Number(p.amount || 0);
                  }, 0);
                  var balance = Math.round((total - paidTotal) * 100) / 100;
                  var paymentStatus = balance <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'unpaid';
                  return Object.assign({}, s, {
                    parts: serviceParts,
                    payments: paymentsBySvc[s.id] || [],
                    images: imagesBySvc[s.id] || [],
                    total: total,
                    paidTotal: paidTotal,
                    balance: balance,
                    paymentStatus: paymentStatus
                  });
                });
                respond(servicesWithExtra);
              });
            });
        });
      }).catch(function (err) {
        controlsJson(err, res);
      });
  });
});

function updateServicePaymentStatus(serviceId) {
  return supabase.from('service_parts').select('total_price').eq('service_id', serviceId).then(function (pr) {
    var partsTotal = (pr.data || []).reduce(function (s, p) { return s + Number(p.total_price || 0); }, 0);
    return supabase.from('services').select('service_price').eq('id', serviceId).single().then(function (sr) {
      var total = Number((sr.data && sr.data.service_price) || 0) + partsTotal;
      return supabase.from('service_payments').select('amount').eq('service_id', serviceId).then(function (payRes) {
        var paid = (payRes.data || []).reduce(function (s, p) { return s + Number(p.amount || 0); }, 0);
        var status = paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
        return supabase.from('services').update({ payment_status: status }).eq('id', serviceId);
      });
    });
  });
}

// Update customer
app.patch('/supplecontrols/api/customers/:id', controlsApiAuth, function (req, res) {
  var customerId = req.params.id;
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    supabase.from('customers').select('id').eq('id', customerId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Customer not found' });
      var upd = {};
      ['name', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'notes', 'contact_preference'].forEach(function (k) {
        if (body[k] !== undefined) upd[k] = body[k];
      });
      if (body.phone !== undefined && body.phone) upd.phone = phoneLast10(String(body.phone)) || body.phone;
      if (upd.contact_preference !== undefined) {
        var cp = String(upd.contact_preference || '').toLowerCase();
        upd.contact_preference = cp === 'sms' ? 'sms' : 'email';
      }
      if (Object.keys(upd).length === 0) return res.json({ ok: true });
      supabase.from('customers').update(upd).eq('id', customerId).select().single().then(function (u) {
        if (u.error) return controlsJson(new Error(u.error.message), res);
        sendAccountUpdateByCustomerId(customerId, 'Your customer profile details were updated.');
        res.json(u.data);
      });
    });
  });
});

// Add vehicle
app.post('/supplecontrols/api/customers/:id/vehicles', controlsApiAuth, function (req, res) {
  var customerId = req.params.id;
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    supabase.from('customers').select('id').eq('id', customerId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Customer not found' });
      var year = parseInt(body.year, 10);
      if (!year || year < 1900 || year > 2100) year = new Date().getFullYear();
      supabase.from('vehicles').insert({
        account_id: accountId,
        customer_id: customerId,
        year: year,
        make: (body.make || '').trim() || 'Unknown',
        model: (body.model || '').trim() || 'Unknown',
        trim: body.trim ? String(body.trim).trim() : null,
        vin: body.vin ? String(body.vin).trim() : null,
        license_plate: body.license_plate ? String(body.license_plate).trim() : null,
        mileage: body.mileage != null ? parseInt(body.mileage, 10) : null,
        color: body.color ? String(body.color).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null
      }).select().single().then(function (v) {
        if (v.error) return controlsJson(new Error(v.error.message), res);
        sendAccountUpdateByCustomerId(customerId, 'A vehicle was added to your account.');
        res.status(201).json(v.data);
      });
    });
  });
});

// Update vehicle
app.patch('/supplecontrols/api/vehicles/:id', controlsApiAuth, function (req, res) {
  var vehicleId = req.params.id;
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    supabase.from('vehicles').select('id, customer_id').eq('id', vehicleId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Vehicle not found' });
      var upd = {};
      ['year', 'make', 'model', 'trim', 'vin', 'license_plate', 'mileage', 'color', 'notes'].forEach(function (k) {
        if (body[k] !== undefined) upd[k] = body[k];
      });
      if (body.year !== undefined) upd.year = parseInt(body.year, 10) || r.data.year;
      if (body.mileage !== undefined) upd.mileage = body.mileage === '' || body.mileage === null ? null : parseInt(body.mileage, 10);
      if (Object.keys(upd).length === 0) return res.json(r.data);
      supabase.from('vehicles').update(upd).eq('id', vehicleId).select().single().then(function (u) {
        if (u.error) return controlsJson(new Error(u.error.message), res);
        sendAccountUpdateByCustomerId(r.data.customer_id, 'A vehicle record on your account was updated.');
        res.json(u.data);
      });
    });
  });
});

// Delete vehicle
app.delete('/supplecontrols/api/vehicles/:id', controlsApiAuth, function (req, res) {
  var vehicleId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase.from('vehicles').select('id, customer_id').eq('id', vehicleId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Vehicle not found' });
      supabase.from('vehicles').delete().eq('id', vehicleId).then(function (d) {
        if (d.error) return controlsJson(new Error(d.error.message), res);
        sendAccountUpdateByCustomerId(r.data.customer_id, 'A vehicle was removed from your account.');
        res.status(204).send();
      });
    });
  });
});

// Add service
app.post('/supplecontrols/api/customers/:id/services', controlsApiAuth, function (req, res) {
  var customerId = req.params.id;
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    supabase.from('customers').select('id').eq('id', customerId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Customer not found' });
      supabase.from('services').insert({
        account_id: accountId,
        customer_id: customerId,
        vehicle_id: body.vehicle_id || null,
        status: (body.status || 'draft'),
        service_name: (body.service_name || '').trim() || 'Service',
        service_price: parseFloat(body.service_price) || 0,
        notes: body.notes ? String(body.notes).trim() : null,
        payment_status: 'unpaid',
        bill_status: (body.bill_status === 'posted' ? 'posted' : 'pending')
      }).select().single().then(function (s) {
        if (s.error) return controlsJson(new Error(s.error.message), res);
        sendAccountUpdateByCustomerId(customerId, 'A service record was added to your account.');
        var billStatus = s.data.bill_status || 'pending';
        res.status(201).json(Object.assign({}, s.data, { parts: [], payments: [], total: s.data.service_price, paidTotal: 0, balance: billStatus === 'posted' ? s.data.service_price : 0, paymentStatus: 'unpaid', bill_status: billStatus }));
      });
    });
  });
});

// Update service
app.patch('/supplecontrols/api/services/:id', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    supabase.from('services').select('id, customer_id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      var upd = {};
      ['vehicle_id', 'status', 'service_name', 'service_price', 'notes', 'reference_number', 'scheduled_at', 'completed_at', 'bill_status'].forEach(function (k) {
        if (body[k] !== undefined) upd[k] = body[k];
      });
      if (Object.keys(upd).length === 0) return res.json(r.data);
      supabase.from('services').update(upd).eq('id', serviceId).select().single().then(function (u) {
        if (u.error) return controlsJson(new Error(u.error.message), res);
        sendAccountUpdateByCustomerId(r.data.customer_id, 'A service record on your account was updated.');
        res.json(u.data);
      });
    });
  });
});

// Delete service
app.delete('/supplecontrols/api/services/:id', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase.from('services').select('id, customer_id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      supabase.from('services').delete().eq('id', serviceId).then(function (d) {
        if (d.error) return controlsJson(new Error(d.error.message), res);
        sendAccountUpdateByCustomerId(r.data.customer_id, 'A service record was removed from your account.');
        res.status(204).send();
      });
    });
  });
});

// Add part
app.post('/supplecontrols/api/services/:id/parts', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    supabase.from('services').select('id, customer_id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      var partRow = {
        service_id: serviceId,
        part_name: (body.part_name || '').trim() || 'Part',
        part_number: body.part_number ? String(body.part_number).trim() : null,
        quantity: parseFloat(body.quantity) || 1,
        unit_price: parseFloat(body.unit_price) || 0,
        notes: body.notes ? String(body.notes).trim() : null
      };
      if (body.unit_cost !== undefined && body.unit_cost !== null && String(body.unit_cost).trim() !== '') {
        partRow.unit_cost = parseFloat(body.unit_cost) || 0;
      }
      supabase.from('service_parts').insert(partRow).select().single().then(function (p) {
        if (p.error) return controlsJson(new Error(p.error.message), res);
        sendAccountUpdateByCustomerId(r.data.customer_id, 'Parts were added to a service on your account.');
        res.status(201).json(p.data);
      });
    });
  });
});

// Update part
app.patch('/supplecontrols/api/service-parts/:id', controlsApiAuth, function (req, res) {
  var partId = req.params.id;
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    supabase.from('service_parts').select('id, service_id').eq('id', partId).then(function (r) {
      if (!r.data || r.data.length === 0) return res.status(404).json({ error: 'Part not found' });
      var part = r.data[0];
      supabase.from('services').select('id, customer_id').eq('id', part.service_id).eq('account_id', accountId).single().then(function (s) {
        if (s.error || !s.data) return res.status(404).json({ error: 'Service not found' });
        var upd = {};
        ['part_name', 'part_number', 'quantity', 'unit_price', 'unit_cost', 'notes'].forEach(function (k) {
          if (body[k] !== undefined) upd[k] = body[k];
        });
        if (Object.keys(upd).length === 0) return res.json(part);
        supabase.from('service_parts').update(upd).eq('id', partId).select().single().then(function (u) {
          if (u.error) return controlsJson(new Error(u.error.message), res);
          sendAccountUpdateByCustomerId(s.data.customer_id, 'Parts were updated for a service on your account.');
          res.json(u.data);
        });
      });
    });
  });
});

// Delete part
app.delete('/supplecontrols/api/service-parts/:id', controlsApiAuth, function (req, res) {
  var partId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase.from('service_parts').select('id, service_id').eq('id', partId).then(function (r) {
      if (!r.data || r.data.length === 0) return res.status(404).json({ error: 'Part not found' });
      var serviceId = r.data[0].service_id;
      supabase.from('services').select('id, customer_id').eq('id', serviceId).eq('account_id', accountId).single().then(function (s) {
        if (s.error || !s.data) return res.status(404).json({ error: 'Service not found' });
        supabase.from('service_parts').delete().eq('id', partId).then(function (d) {
          if (d.error) return controlsJson(new Error(d.error.message), res);
          sendAccountUpdateByCustomerId(s.data.customer_id, 'Parts were removed from a service on your account.');
          res.status(204).send();
        });
      });
    });
  });
});

// Add payment (Cash, Credit, etc.) — then recalc payment_status on service
app.post('/supplecontrols/api/services/:id/payments', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  var body = req.body || {};
  var method = (body.method || 'cash').toLowerCase();
  if (!['cash', 'credit', 'check', 'other'].includes(method)) method = 'cash';
  var amount = parseFloat(body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  getAccountThen(req, res, function (accountId) {
    supabase.from('services').select('id, customer_id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      supabase.from('service_payments').insert({
        service_id: serviceId,
        amount: amount,
        method: method,
        notes: body.notes ? String(body.notes).trim() : null
      }).select().single().then(function (p) {
        if (p.error) return controlsJson(new Error(p.error.message), res);
        updateServicePaymentStatus(serviceId).then(function () {
          sendAccountUpdateByCustomerId(r.data.customer_id, 'A payment was posted to your account.');
          res.status(201).json(p.data);
        });
      });
    });
  });
});

// ========== Service images (attach photos to a service) ==========
var upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/supplecontrols/api/services/:id/images', controlsApiAuth, upload.array('images', 10), function (req, res) {
  var serviceId = req.params.id;
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  var files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No images uploaded' });
  var caption = (req.body && req.body.caption != null) ? String(req.body.caption).trim() : null;
  var takenAtLocalLabel = (req.body && req.body.taken_at_local_label != null) ? String(req.body.taken_at_local_label).trim() : null;
  var addressLabel = (req.body && req.body.address_label != null) ? String(req.body.address_label).trim() : null;

  getAccountThen(req, res, function (accountId) {
    var bucket = 'service-images';
    var uploads = files.map(function (file) {
      var safeName = (file.originalname || 'image').replace(/[^a-zA-Z0-9.\-_]/g, '_');
      var pathKey = 'service-' + serviceId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
      return supabase.storage.from(bucket).upload(pathKey, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: false
      }).then(function (up) {
        if (up.error) throw new Error(up.error.message || 'Upload failed');
        var pub = supabase.storage.from(bucket).getPublicUrl(pathKey);
        var url = (pub && pub.data && pub.data.publicUrl) ? pub.data.publicUrl : null;
        if (!url) throw new Error('Could not get public URL for image');
        return { image_url: url };
      });
    });

    Promise.all(uploads)
      .then(function (uploaded) {
        var rows = uploaded.map(function (u) {
          return {
            service_id: serviceId,
            image_url: u.image_url,
            caption: caption,
            taken_at_local_label: takenAtLocalLabel,
            address_label: addressLabel
          };
        });
        return supabase.from('service_images').insert(rows).select('*');
      })
      .then(function (ins) {
        if (ins.error) return controlsJson(new Error(ins.error.message), res);
        res.status(201).json({ images: ins.data || [] });
      })
      .catch(function (err) {
        controlsJson(err, res);
      });
  });
});

function loadServiceInvoiceBundle(serviceId, accountId) {
  return supabase.from('services').select('*').eq('id', serviceId).eq('account_id', accountId).single()
    .then(function (sr) {
      if (sr.error || !sr.data) throw new Error('Service not found');
      var s = sr.data;
      return Promise.all([
        supabase.from('customers').select('*').eq('id', s.customer_id).single(),
        s.vehicle_id ? supabase.from('vehicles').select('*').eq('id', s.vehicle_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('service_parts').select('*').eq('service_id', serviceId)
      ]).then(function (r) {
        if (r[0].error || !r[0].data) throw new Error('Customer not found');
        return {
          service: s,
          customer: r[0].data,
          vehicle: r[1].data,
          parts: r[2].data || []
        };
      });
    });
}

function applyVehicleOverrideToInvoiceBundle(bundle, body) {
  if (!bundle) return bundle;
  var vehicleInput = body && body.vehicle ? body.vehicle : body;
  bundle.vehicle = vehicleReleaseFields.resolveVehicleForDocument(vehicleInput || {}, bundle.vehicle);
  return bundle;
}

function sendInvoicePdfResponse(res, bundle, filename) {
  var invNo = filename || 'invoice-preview.pdf';
  return buildInvoicePdfBuffer(bundle).then(function (buf) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline; filename="' + String(invNo).replace(/"/g, '') + '"');
    res.send(buf);
  });
}

app.get('/supplecontrols/api/services/:id/invoice.pdf', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  if (!supabase) return res.status(503).send('Database not configured');
  getAccountThen(req, res, function (accountId) {
    loadServiceInvoiceBundle(serviceId, accountId)
      .then(function (bundle) {
        applyVehicleOverrideToInvoiceBundle(bundle, req.query || {});
        var invNo = 'PREVIEW-' + String(serviceId).replace(/-/g, '').slice(0, 8).toUpperCase();
        return sendInvoicePdfResponse(res, Object.assign({ invoiceNumber: invNo }, bundle), 'invoice-preview.pdf');
      })
      .catch(function (err) {
        res.status(err.message === 'Service not found' ? 404 : 500).send(err.message || 'Error');
      });
  });
});

app.post('/supplecontrols/api/services/:id/invoice.pdf', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  if (!supabase) return res.status(503).send('Database not configured');
  getAccountThen(req, res, function (accountId) {
    loadServiceInvoiceBundle(serviceId, accountId)
      .then(function (bundle) {
        applyVehicleOverrideToInvoiceBundle(bundle, (req.body && req.body.vehicle) || req.body || {});
        var invNo = 'PREVIEW-' + String(serviceId).replace(/-/g, '').slice(0, 8).toUpperCase();
        return sendInvoicePdfResponse(res, Object.assign({ invoiceNumber: invNo }, bundle), 'invoice-preview.pdf');
      })
      .catch(function (err) {
        res.status(err.message === 'Service not found' ? 404 : 500).send(err.message || 'Error');
      });
  });
});

app.post('/supplecontrols/api/services/:id/invoices/submit', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  getAccountThen(req, res, function (accountId) {
    loadServiceInvoiceBundle(serviceId, accountId)
      .then(function (bundle) {
        applyVehicleOverrideToInvoiceBundle(bundle, (req.body && req.body.vehicle) || req.body || {});
        var d = new Date();
        var mo = d.getMonth() + 1;
        var dy = d.getDate();
        var invNo = 'INV-' + d.getFullYear() + (mo < 10 ? '0' : '') + mo + (dy < 10 ? '0' : '') + dy + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        var receiptTrackerWarning = null;
        return buildInvoicePdfBuffer(Object.assign({ invoiceNumber: invNo }, bundle))
          .then(function (buf) {
            var bucket = 'invoices';
            var pathKey = 'customer-' + bundle.customer.id + '/' + invNo.replace(/[^a-zA-Z0-9.\-_]/g, '_') + '.pdf';
            return supabase.storage.from(bucket).upload(pathKey, buf, {
              contentType: 'application/pdf',
              upsert: false
            }).then(function (up) {
              if (up.error) throw new Error(up.error.message || 'Upload failed');
              var pub = supabase.storage.from(bucket).getPublicUrl(pathKey);
              var url = (pub && pub.data && pub.data.publicUrl) ? pub.data.publicUrl : null;
              if (!url) throw new Error('Could not get public URL');
              return supabase.from('service_invoices').insert({
                account_id: accountId,
                customer_id: bundle.customer.id,
                service_id: serviceId,
                invoice_number: invNo,
                pdf_url: url
              }).select().single().then(function (ins) {
                if (ins.error) throw new Error(ins.error.message || 'Save failed');
                return googleReceiptTracker
                  .appendInvoicePartRows({
                    invoiceNumber: invNo,
                    customer: bundle.customer,
                    parts: bundle.parts,
                    invoiceDate: d
                  })
                  .then(function (sheetResult) {
                    if (sheetResult && sheetResult.skipped && sheetResult.reason === 'no_parts') {
                      receiptTrackerWarning = 'Invoice submitted; no parts on this service, so the receipt tracker sheet was not updated.';
                    }
                    return ins.data;
                  })
                  .catch(function (sheetErr) {
                    console.error('Receipt tracker sheet update failed:', sheetErr);
                    receiptTrackerWarning = 'Invoice submitted, but the Google receipt tracker could not be updated.';
                    return ins.data;
                  });
              });
            });
          })
          .then(function (invoiceRow) {
            var payload = invoiceRow;
            if (receiptTrackerWarning) payload = Object.assign({}, invoiceRow, { receiptTrackerWarning: receiptTrackerWarning });
            res.status(201).json(payload);
          });
      })
      .catch(function (err) {
        controlsJson(err, res);
      });
  });
});

app.get('/supplecontrols/api/dev/status', controlsApiAuth, function (req, res) {
  res.json({ pdfSamples: devPdfSamplesEnabled() });
});

app.get('/supplecontrols/api/dev/demo-estimate.pdf', controlsApiAuth, function (req, res) {
  if (!devPdfSamplesEnabled()) return res.status(404).end();
  var cust = devPdfSamples.fillerCustomer();
  var veh = devPdfSamples.fillerVehicle();
  var ef = estimatePdf.normalizeEstimateReleaseFields(devPdfSamples.fillerEstimateFields());
  estimatePdf
    .buildEstimatePdfBuffer(cust, veh, {
      releaseFields: ef,
      estimateId: '000001',
      documentDate: new Date('2025-01-03T12:00:00'),
      customerSignature: { mode: 'typed', payload: cust.name },
      signedDateStr: '1/3/2025',
      authMethod: 'in_person'
    })
    .then(function (buf) {
      sendDevSamplePdf(res, buf, 'demo-ca-bar-estimate.pdf');
    })
    .catch(function (err) {
      console.error('controls dev demo estimate:', err);
      res.status(500).type('text').send(err.message || 'PDF failed');
    });
});

app.get('/supplecontrols/api/signature-release-options', controlsApiAuth, function (req, res) {
  var pdfFolder = String(process.env.SIGNATURE_RELEASE_MODE || '').trim() === 'pdf-folder';
  res.json({
    requiresAgreementFields: !pdfFolder,
    fieldSpec: agreementPdf.AGREEMENT_RELEASE_FIELD_SPEC
  });
});

app.get('/supplecontrols/api/estimate-release-options', controlsApiAuth, function (req, res) {
  res.json({
    requiresEstimateFields: true,
    fieldSpec: estimatePdf.ESTIMATE_RELEASE_FIELD_SPEC
  });
});

app.post('/supplecontrols/api/estimate-builder/preview', controlsApiAuth, function (req, res) {
  var body = req.body || {};
  var customer = customerFromEstimateBuilderBody(body.customer);
  var fields = (body && body.fields) || {};
  if (!customer.name) {
    return res.status(400).json({ error: 'Customer name is required.', missing: ['customer.name'] });
  }
  var missing = estimatePdf.validateEstimateReleaseFieldsComplete(fields);
  if (missing.length) {
    return res.status(400).json({
      error: 'Every estimate field is required before generating the document.',
      missing: missing
    });
  }
  var normalized = estimatePdf.normalizeEstimateReleaseFields(fields);
  var resolvedVeh = estimatePdf.resolveVehicleForDocument(normalized, null);
  estimatePdf
    .buildEstimatePdfBuffer(customer, resolvedVeh, { releaseFields: normalized })
    .then(function (pdfBuf) {
      if (!Buffer.isBuffer(pdfBuf)) {
        throw new Error('Estimate PDF could not be generated');
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'private, no-store');
      var saved = customerExportFiles.trySaveCustomerExport({
        documentType: 'estimate',
        customer: customer,
        extension: 'pdf',
        content: pdfBuf
      });
      customerExportFiles.attachExportHeaders(res, saved);
      res.send(pdfBuf);
    })
    .catch(function (err) {
      if (!res.headersSent) controlsJson(err, res);
    });
});

app.get('/supplecontrols/api/document-builder/saves', controlsApiAuth, function (req, res) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  var docType = String((req.query && req.query.type) || 'estimate').toLowerCase();
  if (docType !== 'estimate' && docType !== 'invoice') {
    return res.status(400).json({ error: 'Invalid type' });
  }
  getAccountThen(req, res, function (accountId) {
    supabase
      .from('builder_document_saves')
      .select('id, title, customer_name, document_type, source_estimate_id, created_at, updated_at')
      .eq('account_id', accountId)
      .eq('document_type', docType)
      .order('updated_at', { ascending: false })
      .limit(100)
      .then(function (r) {
        if (r.error) return controlsJson(new Error(r.error.message), res);
        res.json({ saves: r.data || [] });
      })
      .catch(function (err) {
        controlsJson(err, res);
      });
  });
});

app.get('/supplecontrols/api/document-builder/saves/:id', controlsApiAuth, function (req, res) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  var saveId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase
      .from('builder_document_saves')
      .select('*')
      .eq('id', saveId)
      .eq('account_id', accountId)
      .single()
      .then(function (r) {
        if (r.error || !r.data) return res.status(404).json({ error: 'Saved document not found' });
        var row = r.data;
        var payload = row.payload || {};
        res.json({
          id: row.id,
          documentType: row.document_type,
          title: row.title,
          customerName: row.customer_name,
          sourceEstimateId: row.source_estimate_id,
          customer: payload.customer || {},
          fields: payload.fields || {},
          invoiceNumber: payload.invoiceNumber || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      })
      .catch(function (err) {
        controlsJson(err, res);
      });
  });
});

app.post('/supplecontrols/api/document-builder/saves', controlsApiAuth, function (req, res) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  var body = req.body || {};
  getAccountThen(req, res, function (accountId) {
    saveBuilderDocumentRow(accountId, body)
      .then(function (r) {
        if (r.error) throw new Error(r.error.message || 'Save failed');
        res.status(body.id ? 200 : 201).json(r.data);
      })
      .catch(function (err) {
        controlsJson(err, res);
      });
  });
});

app.get('/supplecontrols/api/invoice-builder/next-invoice-number', controlsApiAuth, function (req, res) {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  getAccountThen(req, res, function (accountId) {
    invoiceNumberLib
      .getNextInvoiceNumber(supabase, accountId)
      .then(function (invoiceNumber) {
        res.json({ invoiceNumber: invoiceNumber });
      })
      .catch(function (err) {
        controlsJson(err, res);
      });
  });
});

app.post('/supplecontrols/api/invoice-builder/preview', controlsApiAuth, function (req, res) {
  var body = req.body || {};
  var customer = customerFromEstimateBuilderBody(body.customer);
  var fields = (body && body.fields) || {};
  if (!customer.name) {
    return res.status(400).json({ error: 'Customer name is required.', missing: ['customer.name'] });
  }
  var missing = estimatePdf.validateEstimateReleaseFieldsComplete(fields);
  if (missing.length) {
    return res.status(400).json({
      error: 'Fill in all required fields before generating the invoice.',
      missing: missing
    });
  }
  var bundle = documentBuilder.builderFieldsToInvoiceBundle(customer, fields);
  var invNo = String(body.invoiceNumber || '').trim() || 'DRAFT';
  buildInvoicePdfBuffer(Object.assign({ invoiceNumber: invNo }, bundle))
    .then(function (pdfBuf) {
      if (!Buffer.isBuffer(pdfBuf)) throw new Error('Invoice PDF could not be generated');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'private, no-store');
      var saved = customerExportFiles.trySaveCustomerExport({
        documentType: 'invoice',
        customer: customer,
        invoiceNumber: invNo,
        extension: 'pdf',
        content: pdfBuf
      });
      customerExportFiles.attachExportHeaders(res, saved);
      res.send(pdfBuf);
    })
    .catch(function (err) {
      if (!res.headersSent) controlsJson(err, res);
    });
});

app.post('/supplecontrols/api/invoice-builder/export-spreadsheet', controlsApiAuth, function (req, res) {
  var body = req.body || {};
  var customer = customerFromEstimateBuilderBody(body.customer);
  var fields = (body && body.fields) || {};
  if (!customer.name) {
    return res.status(400).json({ error: 'Customer name is required.', missing: ['customer.name'] });
  }
  if (!googleReceiptTracker.isConfigured()) {
    return res.status(503).json({ error: 'Google Receipt Tracker is not configured. Set Google service account env vars.' });
  }
  var missing = estimatePdf.validateEstimateReleaseFieldsComplete(fields);
  if (missing.length) {
    return res.status(400).json({
      error: 'Fill in all required fields before exporting to the spreadsheet.',
      missing: missing
    });
  }
  var bundle = documentBuilder.builderFieldsToInvoiceBundle(customer, fields);
  if (!bundle.parts.length) {
    return res.status(400).json({ error: 'Add at least one part before exporting to the spreadsheet.' });
  }
  var invNo = String(body.invoiceNumber || '').trim() || 'DRAFT';
  googleReceiptTracker
    .appendInvoicePartRows({
      invoiceNumber: invNo,
      customer: bundle.customer,
      parts: bundle.parts,
      invoiceDate: new Date()
    })
    .then(function (result) {
      if (result && result.skipped) {
        return res.status(400).json({ error: 'No parts to export.' });
      }
      var rows = googleReceiptTracker.buildPartRows({
        invoiceNumber: invNo,
        customer: bundle.customer,
        parts: bundle.parts,
        invoiceDate: new Date()
      });
      var csvSaved = customerExportFiles.trySaveCustomerExport({
        documentType: 'invoice',
        customer: customer,
        invoiceNumber: invNo,
        extension: 'csv',
        suffix: '-spreadsheet',
        content: customerExportFiles.buildSpreadsheetCsv(rows)
      });
      var payload = {
        ok: true,
        rowCount: result.rowCount,
        updatedRange: result.updatedRange
      };
      if (csvSaved.ok) {
        payload.savedExport = {
          path: csvSaved.result.path,
          filename: csvSaved.result.filename,
          displayPath: customerExportFiles.displayPath(csvSaved.result.path)
        };
      }
      res.json(payload);
    })
    .catch(function (err) {
      var msg = err && err.message ? String(err.message) : 'Export failed';
      if (/private key|service account|GOOGLE_SERVICE_ACCOUNT|not configured|API key/i.test(msg)) {
        return res.status(503).json({ error: msg });
      }
      controlsJson(err, res);
    });
});

app.post('/supplecontrols/api/export/save-customer-file', controlsApiAuth, function (req, res) {
  var body = req.body || {};
  var customer = customerFromEstimateBuilderBody(body.customer);
  if (!customer.name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }
  if (!body.contentBase64) {
    return res.status(400).json({ error: 'Export content is required.' });
  }
  try {
    var saved = customerExportFiles.saveCustomerExport({
      documentType: body.documentType,
      customer: customer,
      invoiceNumber: body.invoiceNumber,
      extension: body.extension || 'bin',
      pageSuffix: body.pageSuffix || '',
      suffix: body.suffix || '',
      contentBase64: body.contentBase64
    });
    res.json({
      ok: true,
      path: saved.path,
      filename: saved.filename,
      directory: saved.directory,
      displayPath: customerExportFiles.displayPath(saved.path)
    });
  } catch (err) {
    controlsJson(err, res);
  }
});

app.post(
  '/supplecontrols/api/customers/:customerId/signature-bundles/preview-agreement',
  controlsApiAuth,
  function (req, res) {
    var customerId = req.params.customerId;
    var fields = (req.body && req.body.fields) || {};
    var missing = agreementPdf.validateAgreementReleaseFieldsComplete(fields);
    if (missing.length) {
      return res.status(400).json({
        error: 'Every field is required before generating the document.',
        missing: missing
      });
    }
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    getAccountThen(req, res, function (accountId) {
      supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('account_id', accountId)
        .single()
        .then(function (c) {
          if (c.error || !c.data) {
            res.status(404).json({ error: 'Customer not found' });
            return;
          }
          var cust = c.data;
          return supabase
            .from('vehicles')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
            .then(function (vr) {
              return agreementPdf.buildAgreementPdfBuffer(cust, vr.data && !vr.error ? vr.data : null, {
                releaseFields: agreementPdf.normalizeAgreementReleaseFields(fields)
              });
            })
            .then(function (pdfBuf) {
              if (!Buffer.isBuffer(pdfBuf)) {
                throw new Error('Agreement PDF could not be generated');
              }
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Cache-Control', 'private, no-store');
              res.send(pdfBuf);
            });
        })
        .catch(function (err) {
          if (!res.headersSent) controlsJson(err, res);
        });
    });
  }
);

app.post(
  '/supplecontrols/api/customers/:customerId/signature-bundles/preview-estimate',
  controlsApiAuth,
  function (req, res) {
    var customerId = req.params.customerId;
    var fields = (req.body && req.body.fields) || {};
    var missing = estimatePdf.validateEstimateReleaseFieldsComplete(fields);
    if (missing.length) {
      return res.status(400).json({
        error: 'Every estimate field is required before generating the document.',
        missing: missing
      });
    }
    if (!supabase) return res.status(503).json({ error: 'Database not configured' });
    getAccountThen(req, res, function (accountId) {
      supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('account_id', accountId)
        .single()
        .then(function (c) {
          if (c.error || !c.data) {
            res.status(404).json({ error: 'Customer not found' });
            return;
          }
          var cust = c.data;
          return supabase
            .from('vehicles')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
            .then(function (vr) {
              var dbVeh = vr.data && !vr.error ? vr.data : null;
              var normalized = estimatePdf.normalizeEstimateReleaseFields(fields);
              var resolvedVeh = estimatePdf.resolveVehicleForDocument(normalized, dbVeh);
              return estimatePdf.buildEstimatePdfBuffer(cust, resolvedVeh, {
                releaseFields: normalized
              });
            })
            .then(function (pdfBuf) {
              if (!Buffer.isBuffer(pdfBuf)) {
                throw new Error('Estimate PDF could not be generated');
              }
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Cache-Control', 'private, no-store');
              res.send(pdfBuf);
            });
        })
        .catch(function (err) {
          if (!res.headersSent) controlsJson(err, res);
        });
    });
  }
);

app.post('/supplecontrols/api/customers/:customerId/signature-bundles/release', controlsApiAuth, function (req, res) {
  var customerId = req.params.customerId;
  var bundleKey = String((req.body && req.body.bundleKey) || 'Starter').trim();
  if (!/^[A-Za-z0-9 _-]+$/.test(bundleKey)) return res.status(400).json({ error: 'Invalid bundle key' });
  var safeKey = bundleKey.replace(/[^A-Za-z0-9 _-]/g, '') || 'Starter';
  var usePdfFolder = String(process.env.SIGNATURE_RELEASE_MODE || '').trim() === 'pdf-folder';
  var isEstimateBundle = safeKey.toLowerCase() === 'estimate';
  var bodyFields = (req.body && req.body.fields) || {};
  var normalizedFields = isEstimateBundle
    ? estimatePdf.normalizeEstimateReleaseFields(bodyFields)
    : agreementPdf.normalizeAgreementReleaseFields(bodyFields);
  if (!usePdfFolder) {
    var miss = isEstimateBundle
      ? estimatePdf.validateEstimateReleaseFieldsComplete(bodyFields)
      : agreementPdf.validateAgreementReleaseFieldsComplete(bodyFields);
    if (miss.length) {
      return res.status(400).json({
        error: isEstimateBundle
          ? 'Fill in every estimate field, preview the document, then submit for signing.'
          : 'Fill in every agreement field, preview the document, then submit for signing.',
        missing: miss
      });
    }
  }
  var dir = path.join(__dirname, 'blank-docs', safeKey);
  var files = [];
  if (usePdfFolder) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      return res.status(400).json({
        error:
          'SIGNATURE_RELEASE_MODE=pdf-folder requires folder blank-docs/' +
          safeKey +
          ' with PDF files. Otherwise omit that env to use built-in document generation.'
      });
    }
    files = fs.readdirSync(dir).filter(function (f) { return f.toLowerCase().endsWith('.pdf'); }).sort();
    if (files.length === 0) {
      return res.status(400).json({ error: 'No PDF files in blank-docs/' + safeKey });
    }
  }
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  var bucket = 'invoices';
  var releaseCustomerRow = null;
  getAccountThen(req, res, function (accountId) {
    supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('account_id', accountId)
      .single()
      .then(function (c) {
        if (c.error || !c.data) {
          res.status(404).json({ error: 'Customer not found' });
          return Promise.reject(new Error('__abort_release'));
        }
        releaseCustomerRow = c.data;
        return supabase
          .from('customer_signature_bundles')
          .delete()
          .eq('customer_id', customerId)
          .eq('bundle_key', safeKey)
          .eq('status', 'pending');
      })
      .then(function () {
        return supabase
          .from('customer_signature_bundles')
          .insert({
            account_id: accountId,
            customer_id: customerId,
            bundle_key: safeKey,
            status: 'pending',
            release_fields: usePdfFolder ? {} : normalizedFields
          })
          .select('id')
          .single();
      })
      .then(function (ins) {
        if (ins.error) throw new Error(ins.error.message);
        var bundleId = ins.data.id;
        if (!usePdfFolder) {
          return supabase
            .from('vehicles')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
            .then(function (vr) {
              var dbVeh = vr.data || null;
              var resolvedVeh = isEstimateBundle
                ? estimatePdf.resolveVehicleForDocument(normalizedFields, dbVeh)
                : dbVeh;
              var builder = isEstimateBundle ? estimatePdf.buildEstimatePdfBuffer : agreementPdf.buildAgreementPdfBuffer;
              return builder(releaseCustomerRow, resolvedVeh, {
                releaseFields: normalizedFields
              });
            })
            .then(function (pdfBuf) {
              var pathKey =
                'signable/' +
                customerId +
                '/' +
                bundleId +
                '/' +
                Date.now() +
                (isEstimateBundle ? '-estimate.pdf' : '-agreement.pdf');
              return supabase.storage
                .from(bucket)
                .upload(pathKey, pdfBuf, { contentType: 'application/pdf', upsert: false })
                .then(function (up) {
                  if (up.error) throw new Error(up.error.message || 'Upload failed');
                  var pub = supabase.storage.from(bucket).getPublicUrl(pathKey);
                  var url = pub && pub.data && pub.data.publicUrl;
                  if (!url) throw new Error('Could not get public URL');
                  return { pdfBuf: pdfBuf, url: url };
                })
                .then(function (uploaded) {
                  return supabase.from('customer_signature_bundle_docs').insert([
                    { bundle_id: bundleId, title: isEstimateBundle ? 'Estimate' : 'Agreement', pdf_url: uploaded.url, sort_order: 0 }
                  ]).then(function (docIns) {
                    if (docIns.error) throw new Error(docIns.error.message);
                    return insertCustomerDocumentAndNotifyRelease({
                      accountId: accountId,
                      customerRow: releaseCustomerRow,
                      isEstimateBundle: isEstimateBundle,
                      pdfUrl: uploaded.url,
                      pdfBuf: uploaded.pdfBuf,
                      pdfFilename: isEstimateBundle ? 'estimate.pdf' : 'agreement.pdf'
                    }).then(function () {
                      res.status(201).json({
                        ok: true,
                        bundleKey: safeKey,
                        documentCount: 1,
                        source: isEstimateBundle ? 'estimate-generated' : (agreementPdf.hasAgreementMarkdown() ? 'agreement-md' : 'agreement-default')
                      });
                    });
                  });
                });
            });
        }
        var uploads = files.map(function (file, idx) {
          var buf = fs.readFileSync(path.join(dir, file));
          var pathKey =
            'signable/' +
            customerId +
            '/' +
            bundleId +
            '/' +
            Date.now() +
            '-' +
            idx +
            '-' +
            file.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          return supabase.storage
            .from(bucket)
            .upload(pathKey, buf, { contentType: 'application/pdf', upsert: false })
            .then(function (up) {
              if (up.error) throw new Error(up.error.message || 'Upload failed');
              var pub = supabase.storage.from(bucket).getPublicUrl(pathKey);
              var url = pub && pub.data && pub.data.publicUrl;
              if (!url) throw new Error('Could not get public URL');
              var title = file.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
              return { bundle_id: bundleId, title: title, pdf_url: url, sort_order: idx };
            });
        });
        return Promise.all(uploads).then(function (rows) {
          return supabase.from('customer_signature_bundle_docs').insert(rows).then(function (docIns) {
            if (docIns.error) throw new Error(docIns.error.message);
            var firstFileBuf = files.length ? fs.readFileSync(path.join(dir, files[0])) : null;
            var firstDocUrl = rows.length ? rows[0].pdf_url : '';
            return insertCustomerDocumentAndNotifyRelease({
              accountId: accountId,
              customerRow: releaseCustomerRow,
              isEstimateBundle: isEstimateBundle,
              pdfUrl: firstDocUrl,
              pdfBuf: firstFileBuf,
              pdfFilename: files[0] || 'document.pdf'
            }).then(function () {
              var extraDocs = rows.slice(1).map(function (row) {
                return {
                  account_id: accountId,
                  customer_id: customerId,
                  title: row.title || 'Document (awaiting signature)',
                  pdf_url: row.pdf_url
                };
              });
              if (!extraDocs.length) {
                res.status(201).json({ ok: true, bundleKey: safeKey, documentCount: files.length, source: 'pdf' });
                return;
              }
              return supabase.from('customer_documents').insert(extraDocs).then(function (extraIns) {
                if (extraIns.error) {
                  console.error('customer_documents extra insert on release:', extraIns.error.message || extraIns.error);
                }
                res.status(201).json({ ok: true, bundleKey: safeKey, documentCount: files.length, source: 'pdf' });
              });
            });
          });
        });
      })
      .catch(function (err) {
        if (err.message === '__abort_release') return;
        controlsJson(err, res);
      });
  });
});

// Add customer contact (extra email/phone)
app.post('/supplecontrols/api/customers/:id/contacts', controlsApiAuth, function (req, res) {
  var customerId = req.params.id;
  var body = req.body || {};
  var type = (body.type || 'email').toLowerCase();
  if (type !== 'email' && type !== 'phone') type = 'email';
  var value = type === 'phone' ? (phoneLast10(String(body.value || '')) || String(body.value || '').trim()) : String(body.value || '').trim();
  if (!value) return res.status(400).json({ error: 'Value required' });
  getAccountThen(req, res, function (accountId) {
    supabase.from('customers').select('id').eq('id', customerId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Customer not found' });
      supabase.from('customer_contacts').insert({ customer_id: customerId, type: type, value: value }).select().single().then(function (c) {
        if (c.error) return controlsJson(new Error(c.error.message), res);
        res.status(201).json(c.data);
      });
    });
  });
});

// Delete customer contact
app.delete('/supplecontrols/api/customer-contacts/:id', controlsApiAuth, function (req, res) {
  var contactId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase.from('customer_contacts').select('id, customer_id').eq('id', contactId).then(function (r) {
      if (!r.data || r.data.length === 0) return res.status(404).json({ error: 'Contact not found' });
      supabase.from('customers').select('id').eq('id', r.data[0].customer_id).eq('account_id', accountId).single().then(function (c) {
        if (c.error || !c.data) return res.status(404).json({ error: 'Customer not found' });
        supabase.from('customer_contacts').delete().eq('id', contactId).then(function (d) {
          if (d.error) return controlsJson(new Error(d.error.message), res);
          res.status(204).send();
        });
      });
    });
  });
});

module.exports = app;

var port = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(port, function () {
    console.log('Supple Automotive server on http://localhost:' + port);
  });
}
