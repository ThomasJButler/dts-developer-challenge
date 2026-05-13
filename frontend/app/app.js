'use strict';

const path = require('path');

const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');

const { createApiClient } = require('./lib/api-client');
const { tokenMiddleware, verifyOnPost } = require('./lib/csrf');
const { flashMiddleware } = require('./lib/flash');

const ROOT_DIR = path.join(__dirname, '..');
const GOVUK_DIST = path.join(ROOT_DIR, 'node_modules', 'govuk-frontend', 'dist');

function resolveSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  // Dev / test default. Not secret in any meaningful sense — the guard
  // above stops this value reaching production.
  return 'dev-only-session-secret-not-for-production';
}

function createApp({ apiClient } = {}) {
  const app = express();

  // Nunjucks resolves "govuk/template.njk" and the component macros from the
  // govuk-frontend npm package's dist folder. App templates take precedence.
  nunjucks.configure([path.join(__dirname, 'views'), GOVUK_DIST], {
    autoescape: true,
    express: app,
    noCache: process.env.NODE_ENV !== 'production',
  });
  app.set('view engine', 'njk');

  // Layout-level defaults fed into every template render. The govuk/template.njk
  // base reads htmlLang, assetPath, and themeColor; serviceName/serviceMetaText
  // are consumed by our header override in layouts/main.njk.
  app.locals.serviceName = 'Manage your tasks';
  app.locals.serviceMetaText = 'HMCTS caseworker';
  app.locals.htmlLang = 'en-GB';
  app.locals.assetPath = '/assets';
  app.locals.themeColor = '#0b0c0c';

  // The API client is the integration seam to the backend. Tests inject a
  // stub; production builds one from process.env.API_BASE_URL.
  app.locals.apiClient = apiClient || createApiClient();

  // govuk-frontend.min.css hard-codes absolute "url(/assets/fonts/…)" URLs
  // for its bundled web fonts and the GOV.UK crest, so the assets folder
  // must be reachable at /assets exactly. /govuk/ exposes the rest of the
  // dist (the CSS and ESM bundles we load from layouts/main.njk).
  const govukRoot = path.join(GOVUK_DIST, 'govuk');
  app.use('/assets', express.static(path.join(govukRoot, 'assets')));
  app.use('/govuk', express.static(govukRoot));
  app.use('/public', express.static(path.join(ROOT_DIR, 'public')));

  app.use(express.urlencoded({ extended: false }));
  app.use(session({
    name: 'mytasks.sid',
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  }));
  app.use(tokenMiddleware);
  app.use(verifyOnPost);
  app.use(flashMiddleware);

  app.use('/', require('./routes/index'));
  app.use('/tasks', require('./routes/tasks'));

  return app;
}

module.exports = { createApp };
