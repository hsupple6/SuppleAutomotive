/**
 * Shop-local dates/times for documents (server runs UTC on Vercel).
 */
function shopTimeZone() {
  return String(process.env.SHOP_TIMEZONE || 'America/Los_Angeles').trim() || 'America/Los_Angeles';
}

function toDate(when) {
  if (when instanceof Date && !isNaN(when.getTime())) return when;
  var d = new Date(when);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDocumentDate(when) {
  return toDate(when).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: shopTimeZone()
  });
}

function formatDocumentTime(when) {
  return toDate(when).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: shopTimeZone(),
    timeZoneName: 'short'
  });
}

function formatSignedDateTime(when) {
  var d = toDate(when);
  return (
    d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: shopTimeZone()
    }) +
    ' at ' +
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: shopTimeZone(),
      timeZoneName: 'short'
    })
  );
}

module.exports = {
  shopTimeZone: shopTimeZone,
  formatDocumentDate: formatDocumentDate,
  formatDocumentTime: formatDocumentTime,
  formatSignedDateTime: formatSignedDateTime
};
