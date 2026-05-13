'use strict';

const crypto = require('node:crypto');

const TOKEN_BYTES = 32;
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Single per-session token. Re-using the same value across forms is fine
// for synchroniser-token CSRF: an attacker on a different origin still
// cannot read the token, and the token never appears in a URL. We bind
// it to req.session so logout / session-rotation (if added later) clears
// it automatically.
function tokenMiddleware(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function tokensMatch(expected, submitted) {
  if (typeof submitted !== 'string' || submitted.length !== expected.length) return false;
  // Constant-time compare: the strings are equal-length hex, so the buffers
  // are equal-length too, which timingSafeEqual requires.
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(submitted, 'utf8'));
}

function verifyOnPost(req, res, next) {
  if (!STATE_CHANGING_METHODS.has(req.method)) return next();
  const expected = req.session && req.session.csrfToken;
  const submitted = req.body && req.body._csrf;
  if (!expected || !tokensMatch(expected, submitted)) {
    return res.status(403).render('errors/forbidden', {
      pageTitle: 'Forbidden',
      reason: 'Invalid or missing CSRF token',
    });
  }
  next();
}

module.exports = { tokenMiddleware, verifyOnPost };
