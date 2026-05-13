'use strict';

// One-shot flash bag: routes write to req.session.flash before redirecting;
// the next render reads res.locals.flash and the value is wiped. Keeps
// success banners and "task not found" notices out of the URL.
function flashMiddleware(req, res, next) {
  res.locals.flash = (req.session && req.session.flash) || {};
  if (req.session) delete req.session.flash;
  next();
}

module.exports = { flashMiddleware };
