'use strict';

const { expect } = require('chai');
const { DateTime, Settings } = require('luxon');

const { validateTaskForm, buildErrorSummary } = require('../app/lib/task-form');

// The date-validation rules ("today or in the future", "real date") are
// time-sensitive. We pin Luxon's idea of "now" to a fixed instant for the
// duration of the suite so the cases that turn on past/future do not flake
// across DST boundaries or year rollover. Resolve to millis once, before
// the override, so Settings.now itself can't recurse through fromISO.
const FIXED_NOW_MILLIS = DateTime.fromISO('2026-05-13T10:00:00', {
  zone: 'Europe/London',
}).toMillis();

describe('validateTaskForm', () => {
  before(() => {
    Settings.now = () => FIXED_NOW_MILLIS;
  });
  after(() => {
    Settings.now = () => Date.now();
  });

  function emptyDue() {
    return { day: '', month: '', year: '', hour: '', minute: '' };
  }

  it('flags an empty title with the GOV.UK message', () => {
    const { errors } = validateTaskForm({
      title: '   ',
      description: '',
      status: 'todo',
      due: emptyDue(),
    });
    expect(errors.title).to.equal('Enter a title');
  });

  it('flags a title over 255 characters', () => {
    const { errors } = validateTaskForm({
      title: 'x'.repeat(256),
      description: '',
      status: 'todo',
      due: emptyDue(),
    });
    expect(errors.title).to.equal('Title must be 255 characters or fewer');
  });

  it('accepts a 255-character title', () => {
    const { errors } = validateTaskForm({
      title: 'x'.repeat(255),
      description: '',
      status: 'todo',
      due: emptyDue(),
    });
    expect(errors.title).to.equal(undefined);
  });

  it('flags an unknown status', () => {
    const { errors } = validateTaskForm({
      title: 'A title',
      description: '',
      status: 'bogus',
      due: emptyDue(),
    });
    expect(errors.status).to.equal('Select a status');
  });

  it('flags a missing status', () => {
    const { errors } = validateTaskForm({
      title: 'A title',
      description: '',
      status: undefined,
      due: emptyDue(),
    });
    expect(errors.status).to.equal('Select a status');
  });

  it('accepts an entirely empty due-date group (the field is optional)', () => {
    const { errors, value } = validateTaskForm({
      title: 'A title',
      description: '',
      status: 'todo',
      due: emptyDue(),
    });
    expect(errors.due).to.equal(undefined);
    expect(value.dueIso).to.equal(null);
  });

  it('flags a partially filled due-date group', () => {
    const { errors } = validateTaskForm({
      title: 'A title',
      description: '',
      status: 'todo',
      due: { day: '20', month: '5', year: '2026', hour: '', minute: '' },
    });
    expect(errors.due).to.equal(
      'Enter a complete date and time, or leave all date and time fields blank',
    );
  });

  it('flags a date that does not exist on the calendar', () => {
    const { errors } = validateTaskForm({
      title: 'A title',
      description: '',
      status: 'todo',
      due: { day: '31', month: '2', year: '2027', hour: '09', minute: '00' },
    });
    expect(errors.due).to.equal('Enter a real date and time');
  });

  it('flags a date in the past', () => {
    const { errors } = validateTaskForm({
      title: 'A title',
      description: '',
      status: 'todo',
      due: { day: '1', month: '1', year: '2026', hour: '09', minute: '00' },
    });
    expect(errors.due).to.equal('Due date must be today or in the future');
  });

  it('converts a valid Europe/London due to a UTC ISO 8601 string', () => {
    // 20 May 2026 09:00 London (BST, UTC+1) → 08:00 UTC.
    const { errors, value } = validateTaskForm({
      title: 'Review case bundle',
      description: 'Initial triage',
      status: 'todo',
      due: { day: '20', month: '5', year: '2026', hour: '09', minute: '00' },
    });
    expect(errors).to.deep.equal({});
    expect(value.dueIso).to.equal('2026-05-20T08:00:00.000Z');
  });

  it('treats December (GMT) without a BST offset', () => {
    const { errors, value } = validateTaskForm({
      title: 'A title',
      description: '',
      status: 'todo',
      due: { day: '20', month: '12', year: '2026', hour: '09', minute: '00' },
    });
    expect(errors).to.deep.equal({});
    expect(value.dueIso).to.equal('2026-12-20T09:00:00.000Z');
  });

  it('trims the title and passes the description through', () => {
    const { value } = validateTaskForm({
      title: '  Review case bundle  ',
      description: '  Notes here  ',
      status: 'todo',
      due: emptyDue(),
    });
    expect(value.title).to.equal('Review case bundle');
    expect(value.description).to.equal('  Notes here  ');
  });
});

describe('buildErrorSummary', () => {
  it('emits links in field order title -> status -> due', () => {
    const list = buildErrorSummary({
      due: 'Enter a real date and time',
      status: 'Select a status',
      title: 'Enter a title',
    });
    expect(list).to.deep.equal([
      { text: 'Enter a title', href: '#title' },
      { text: 'Select a status', href: '#status' },
      { text: 'Enter a real date and time', href: '#due-day' },
    ]);
  });

  it('returns an empty list when there are no errors', () => {
    expect(buildErrorSummary({})).to.deep.equal([]);
  });
});
