'use strict';

const request = require('supertest');
const { expect } = require('chai');

const { createApp } = require('../app/app');

describe('GET /', () => {
  let response;

  before(async () => {
    response = await request(createApp()).get('/');
  });

  it('returns 200', () => {
    expect(response.status).to.equal(200);
  });

  it('renders the service name', () => {
    expect(response.text).to.include('Manage your tasks');
  });

  it('extends the GOV.UK base template (govuk-template__body present)', () => {
    expect(response.text).to.include('govuk-template__body');
  });

  it('renders the custom service header from the design handoff', () => {
    expect(response.text).to.include('class="service-header"');
  });

  it('declares the document as en-GB for accessibility', () => {
    expect(response.text).to.match(/<html[^>]*\blang="en-GB"/);
  });
});
