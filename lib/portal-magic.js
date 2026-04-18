var crypto = require('crypto');

function getSecret() {
  return String(
    process.env.PORTAL_MAGIC_SECRET ||
      process.env.SUPPLE_CONTROLS_SESSION_SECRET ||
      ''
  ).trim();
}

function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64urlDecode(str) {
  var s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

/**
 * Signed portal token (HMAC). Expires after PORTAL_MAGIC_TTL_SECONDS (default 7d).
 * @param {string} customerId uuid
 * @returns {string|null}
 */
function signPortalToken(customerId) {
  var secret = getSecret();
  if (!secret || !customerId) return null;
  var ttl = parseInt(process.env.PORTAL_MAGIC_TTL_SECONDS || '', 10);
  if (!ttl || ttl < 60) ttl = 7 * 24 * 60 * 60;
  var exp = Math.floor(Date.now() / 1000) + ttl;
  var payload = JSON.stringify({ v: 1, cid: String(customerId), exp: exp });
  var body = b64urlEncode(Buffer.from(payload, 'utf8'));
  var sig = crypto.createHmac('sha256', secret).update(body).digest();
  var sigStr = b64urlEncode(sig);
  return body + '.' + sigStr;
}

/**
 * @param {string} token
 * @returns {string|null} customer id
 */
function verifyPortalToken(token) {
  var secret = getSecret();
  if (!secret || !token) return null;
  var parts = String(token).split('.');
  if (parts.length !== 2) return null;
  var body = parts[0];
  var sigGot = b64urlDecode(parts[1]);
  var sigExpected = crypto.createHmac('sha256', secret).update(body).digest();
  if (sigGot.length !== sigExpected.length || !crypto.timingSafeEqual(sigGot, sigExpected)) return null;
  try {
    var data = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (!data || data.v !== 1 || !data.cid || !data.exp) return null;
    if (Math.floor(Date.now() / 1000) > Number(data.exp)) return null;
    return String(data.cid);
  } catch (e) {
    return null;
  }
}

/**
 * @param {string} paymentPortalUrl base payment page URL
 * @param {string|null} customerId
 * @returns {string}
 */
function portalUrlWithToken(paymentPortalUrl, customerId) {
  var base = String(paymentPortalUrl || '').replace(/\/$/, '');
  if (!base) return '';
  var tok = customerId ? signPortalToken(customerId) : null;
  if (!tok) return base;
  var sep = base.indexOf('?') === -1 ? '?' : '&';
  return base + sep + 'p=' + encodeURIComponent(tok);
}

module.exports = {
  signPortalToken: signPortalToken,
  verifyPortalToken: verifyPortalToken,
  portalUrlWithToken: portalUrlWithToken
};
