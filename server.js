/**
 * Supple Automotive — form submission API + Supabase
 * POST /api/submit-service-request → email/SMS + create customer/vehicle/service in DB
 * POST /api/payment-lookup → find customer by contact, return balance + past services
 */
require('dotenv').config();
var path = require('path');
var express = require('express');
var session = require('express-session');
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Controls panel: /supplecontrols — login with username/password from .env
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
function sendControlsPanel(res) {
  var panelPath = path.join(viewsPath, 'supplecontrols-panel.html');
  require('fs').exists(panelPath, function (exists) {
    if (exists) {
      res.sendFile(panelPath);
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(
        '<!DOCTYPE html><html><head><title>Supple Controls</title></head><body>' +
        '<h1>Supple Controls</h1><p>Panel view not found. Create views/supplecontrols-panel.html</p>' +
        '<a href="/supplecontrols/logout">Sign out</a></body></html>'
      );
    }
  });
}

// Static files: public/ for Vercel compatibility (Vercel serves public/ via CDN; locally we serve it here)
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
    vehicle_year: 'Vehicle year',
    vehicle_make: 'Make',
    vehicle_model: 'Model',
    service_type: 'Service needed',
    details: 'Details',
    preferred_date: 'Preferred date',
    preferred_time: 'Preferred time',
    notes: 'Additional notes'
  };
  Object.keys(labels).forEach(function (key) {
    var val = data[key];
    if (val != null && String(val).trim() !== '') {
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

app.post('/api/submit-service-request', function (req, res) {
  function sendError(status, message) {
    res.status(status).json({ ok: false, error: message });
  }

  try {
    var body = req.body || {};
    var toEmail = body.toEmail;
    var toPhone = body.toPhone;
    if (!toEmail || !toPhone) {
      return sendError(400, 'Missing toEmail or toPhone');
    }

    var formData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      vehicle_year: body.vehicle_year,
      vehicle_make: body.vehicle_make,
      vehicle_model: body.vehicle_model,
      service_type: body.service_type,
      details: body.details,
      preferred_date: body.preferred_date,
      preferred_time: body.preferred_time,
      notes: body.notes
    };

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
          return Promise.resolve();
        }

        return getOrCreateShopAccount().then(function (accountId) {
          if (!accountId) return Promise.reject(new Error('Could not get or create shop account'));
          var query = supabase.from('customers').select('id').eq('account_id', accountId);
          if (email) query = query.eq('email', email);
          else if (phone) query = query.eq('phone', phone);
          else {
            return supabase.from('customers').insert({ account_id: accountId, name: name }).select('id').single()
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
            if (cust.data) return { accountId: accountId, customerId: cust.data.id, vehicleId: null };
            return supabase.from('customers').insert({
              account_id: accountId,
              name: name,
              email: email || null,
              phone: phone || null
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
              notes: [formData.details, formData.notes].filter(Boolean).join('\n') || null
            }).then(function (r) {
              if (r && r.error) return Promise.reject(new Error(r.error.message || 'Service insert failed'));
            });
          });
      })();
    }

    var emailHtml = '<pre style="font-family:sans-serif;white-space:pre-wrap;">' +
      formatFormBody(formData).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
    var smsBody = formatSmsBody(formData);

    var hasEmail = false;
    var hasSms = false;
    // Re-enable: set hasEmail = !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL); hasSms = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);

    var emailPromise = Promise.resolve();
    if (hasEmail) {
      var Resend = require('resend').Resend || require('resend');
      var resend = new Resend(process.env.RESEND_API_KEY);
      emailPromise = resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: toEmail,
        subject: 'Service request — ' + (formData.name || 'Unknown'),
        html: emailHtml
      }).then(function (r) {
        if (r && r.error) {
          var msg = (r.error.message || r.error) || 'Resend error';
          throw new Error('Email: ' + (typeof msg === 'string' ? msg : JSON.stringify(msg)));
        }
        return r;
      });
    }

    var smsPromise = Promise.resolve();
    if (hasSms) {
      var twilio = require('twilio');
      var twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      var toE164 = toPhone.replace(/\s/g, '').replace(/[^\d+]/g, '');
      if (!toE164.match(/^\+/)) toE164 = '+' + toE164;
      smsPromise = twilioClient.messages.create({
        from: process.env.TWILIO_FROM_NUMBER,
        to: toE164,
        body: smsBody
      }).then(function () {}, function (err) {
        throw new Error('SMS: ' + (err.message || 'Twilio error'));
      });
    }

    Promise.all([dbPromise, emailPromise, smsPromise])
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
  var name = (body.name || '').trim();
  var email = (body.email || '').trim();
  var phone = phoneLast10((body.phone || '').trim());
  var referenceNumber = (body.reference_number || '').trim();

  if (!name) {
    return sendError(400, 'Name is required');
  }
  if (!email && !phone) {
    return sendError(400, 'Email or phone is required');
  }

  getOrCreateShopAccount()
    .then(function (accountId) {
      if (!accountId) return Promise.reject(new Error('Database not ready'));
      var q = supabase.from('customers').select('*').eq('account_id', accountId);
      if (email) q = q.eq('email', email);
      else q = q.eq('phone', phone);
      return q.maybeSingle().then(function (c) {
        if (!c.data) return Promise.reject(new Error('No customer found for that email or phone. Submit a request service first to create your account.'));
        return { accountId: accountId, customer: c.data };
      });
    })
    .then(function (_) {
      var customerId = _.customer.id;
      var srvQ = supabase.from('services').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
      if (referenceNumber) srvQ = srvQ.eq('reference_number', referenceNumber);
      return srvQ.then(function (srvRes) {
        var services = srvRes.data || [];
        var serviceIds = services.map(function (s) { return s.id; });
        if (serviceIds.length === 0) {
          var cust = _.customer;
          if (cust && cust.phone) cust.phone = phoneLast10(cust.phone) || cust.phone;
          return res.json({
            ok: true,
            customer: cust,
            vehicles: [],
            services: [],
            balance: 0
          });
        }
        return supabase.from('service_parts').select('*').in('service_id', serviceIds).then(function (partsRes) {
          var parts = partsRes.data || [];
          var partsByService = {};
          parts.forEach(function (p) {
            if (!partsByService[p.service_id]) partsByService[p.service_id] = [];
            partsByService[p.service_id].push(p);
          });
          return supabase.from('service_payments').select('service_id, amount').in('service_id', serviceIds).then(function (payRes) {
            var payments = payRes.data || [];
            var paidByService = {};
            payments.forEach(function (p) {
              paidByService[p.service_id] = (paidByService[p.service_id] || 0) + Number(p.amount || 0);
            });
            var balance = 0;
            var servicesWithParts = services.map(function (s) {
              var serviceParts = partsByService[s.id] || [];
              var partsTotal = serviceParts.reduce(function (sum, p) { return sum + Number(p.total_price || 0); }, 0);
              var total = Number(s.service_price || 0) + partsTotal;
              var paidTotal = paidByService[s.id] || 0;
              var serviceBalance = Math.round((total - paidTotal) * 100) / 100;
              var isPosted = (s.bill_status || 'posted') === 'posted';
              if (isPosted && serviceBalance > 0) balance += serviceBalance;
              var paymentStatus = serviceBalance <= 0 ? 'paid' : (paidTotal > 0 ? 'partial' : 'unpaid');
              return { ...s, parts: serviceParts, total: total, payment_status: paymentStatus, bill_status: s.bill_status || 'posted' };
            });
            return supabase.from('vehicles').select('*').eq('customer_id', customerId).then(function (vRes) {
              var cust = _.customer;
              if (cust && cust.phone) cust.phone = phoneLast10(cust.phone) || cust.phone;
              res.json({
                ok: true,
                customer: cust,
                vehicles: vRes.data || [],
                services: servicesWithParts,
                balance: Math.round(balance * 100) / 100
              });
            });
          });
        });
      });
    })
    .catch(function (err) {
      console.error('Payment lookup error:', err.message || err);
      var isNotFound = err.message && err.message.indexOf('No customer found') === 0;
      sendError(isNotFound ? 404 : 500, err.message || 'Lookup failed');
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

// Get one customer full (vehicles, services with parts + payments, contacts)
app.get('/supplecontrols/api/customers/:id', controlsApiAuth, function (req, res) {
  var customerId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase.from('customers').select('*').eq('id', customerId).eq('account_id', accountId).single().then(function (cRes) {
      if (cRes.error || !cRes.data) return res.status(404).json({ error: 'Customer not found' });
      var customer = cRes.data;
      Promise.all([
        supabase.from('vehicles').select('*').eq('customer_id', customerId).order('created_at', { ascending: true }),
        supabase.from('customer_contacts').select('*').eq('customer_id', customerId)
      ]).then(function (results) {
        var vehicles = (results[0].data || []);
        var contacts = (results[1].data || []);
        supabase.from('services').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).then(function (sRes) {
          var services = sRes.data || [];
          if (services.length === 0) {
            return res.json({ customer: customer, vehicles: vehicles, contacts: contacts, services: [] });
          }
          var serviceIds = services.map(function (s) { return s.id; });
          Promise.all([
            supabase.from('service_parts').select('*').in('service_id', serviceIds),
            supabase.from('service_payments').select('*').in('service_id', serviceIds)
          ]).then(function (partsPayments) {
            var parts = partsPayments[0].data || [];
            var payments = partsPayments[1].data || [];
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
            var servicesWithExtra = services.map(function (s) {
              var serviceParts = partsBySvc[s.id] || [];
              var partsTotal = serviceParts.reduce(function (sum, p) { return sum + Number(p.total_price || 0); }, 0);
              var total = Number(s.service_price || 0) + partsTotal;
              var paidTotal = (paymentsBySvc[s.id] || []).reduce(function (sum, p) { return sum + Number(p.amount || 0); }, 0);
              var balance = Math.round((total - paidTotal) * 100) / 100;
              var paymentStatus = balance <= 0 ? 'paid' : (paidTotal > 0 ? 'partial' : 'unpaid');
              return Object.assign({}, s, { parts: serviceParts, payments: paymentsBySvc[s.id] || [], total: total, paidTotal: paidTotal, balance: balance, paymentStatus: paymentStatus });
            });
            res.json({ customer: customer, vehicles: vehicles, contacts: contacts, services: servicesWithExtra });
          });
        });
      });
    }).catch(function (err) { controlsJson(err, res); });
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
      ['name', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'notes'].forEach(function (k) {
        if (body[k] !== undefined) upd[k] = body[k];
      });
      if (body.phone !== undefined && body.phone) upd.phone = phoneLast10(String(body.phone)) || body.phone;
      if (Object.keys(upd).length === 0) return res.json({ ok: true });
      supabase.from('customers').update(upd).eq('id', customerId).select().single().then(function (u) {
        if (u.error) return controlsJson(new Error(u.error.message), res);
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
    supabase.from('vehicles').select('id').eq('id', vehicleId).eq('account_id', accountId).single().then(function (r) {
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
        res.json(u.data);
      });
    });
  });
});

// Delete vehicle
app.delete('/supplecontrols/api/vehicles/:id', controlsApiAuth, function (req, res) {
  var vehicleId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase.from('vehicles').select('id').eq('id', vehicleId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Vehicle not found' });
      supabase.from('vehicles').delete().eq('id', vehicleId).then(function (d) {
        if (d.error) return controlsJson(new Error(d.error.message), res);
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
    supabase.from('services').select('id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      var upd = {};
      ['vehicle_id', 'status', 'service_name', 'service_price', 'notes', 'reference_number', 'scheduled_at', 'completed_at', 'bill_status'].forEach(function (k) {
        if (body[k] !== undefined) upd[k] = body[k];
      });
      if (Object.keys(upd).length === 0) return res.json(r.data);
      supabase.from('services').update(upd).eq('id', serviceId).select().single().then(function (u) {
        if (u.error) return controlsJson(new Error(u.error.message), res);
        res.json(u.data);
      });
    });
  });
});

// Delete service
app.delete('/supplecontrols/api/services/:id', controlsApiAuth, function (req, res) {
  var serviceId = req.params.id;
  getAccountThen(req, res, function (accountId) {
    supabase.from('services').select('id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      supabase.from('services').delete().eq('id', serviceId).then(function (d) {
        if (d.error) return controlsJson(new Error(d.error.message), res);
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
    supabase.from('services').select('id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      supabase.from('service_parts').insert({
        service_id: serviceId,
        part_name: (body.part_name || '').trim() || 'Part',
        part_number: body.part_number ? String(body.part_number).trim() : null,
        quantity: parseFloat(body.quantity) || 1,
        unit_price: parseFloat(body.unit_price) || 0,
        notes: body.notes ? String(body.notes).trim() : null
      }).select().single().then(function (p) {
        if (p.error) return controlsJson(new Error(p.error.message), res);
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
      supabase.from('services').select('id').eq('id', part.service_id).eq('account_id', accountId).single().then(function (s) {
        if (s.error || !s.data) return res.status(404).json({ error: 'Service not found' });
        var upd = {};
        ['part_name', 'part_number', 'quantity', 'unit_price', 'notes'].forEach(function (k) {
          if (body[k] !== undefined) upd[k] = body[k];
        });
        if (Object.keys(upd).length === 0) return res.json(part);
        supabase.from('service_parts').update(upd).eq('id', partId).select().single().then(function (u) {
          if (u.error) return controlsJson(new Error(u.error.message), res);
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
      supabase.from('services').select('id').eq('id', serviceId).eq('account_id', accountId).single().then(function (s) {
        if (s.error || !s.data) return res.status(404).json({ error: 'Service not found' });
        supabase.from('service_parts').delete().eq('id', partId).then(function (d) {
          if (d.error) return controlsJson(new Error(d.error.message), res);
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
    supabase.from('services').select('id').eq('id', serviceId).eq('account_id', accountId).single().then(function (r) {
      if (r.error || !r.data) return res.status(404).json({ error: 'Service not found' });
      supabase.from('service_payments').insert({
        service_id: serviceId,
        amount: amount,
        method: method,
        notes: body.notes ? String(body.notes).trim() : null
      }).select().single().then(function (p) {
        if (p.error) return controlsJson(new Error(p.error.message), res);
        updateServicePaymentStatus(serviceId).then(function () {
          res.status(201).json(p.data);
        });
      });
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
