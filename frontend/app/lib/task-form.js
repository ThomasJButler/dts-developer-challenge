'use strict';

const { DateTime } = require('luxon');

const STATUS_VALUES = ['todo', 'in_progress', 'done'];

// Caseworkers in the brief operate in Europe/London; the API stores UTC.
// All form-side date validation runs in this zone so the "is it in the
// past?" check matches what the user sees on their clock.
const FORM_ZONE = 'Europe/London';

// Each part is a string straight off req.body (Express's urlencoded parser
// never converts numerically). Empty values come through as '', not
// undefined, so the "all blank" / "all filled" check uses string emptiness.
function dueState(due) {
  const parts = ['day', 'month', 'year', 'hour', 'minute'].map((k) => (due && due[k]) || '');
  const filled = parts.filter((v) => v.trim() !== '').length;
  if (filled === 0) return { kind: 'empty' };
  if (filled < 5) return { kind: 'partial' };
  return { kind: 'all', parts };
}

function toIntPair(parts) {
  return parts.map((v) => Number.parseInt(v, 10));
}

function validateDue(due) {
  const state = dueState(due);
  if (state.kind === 'empty') return { error: null, iso: null };
  if (state.kind === 'partial') {
    return {
      error: 'Enter a complete date and time, or leave all date and time fields blank',
      iso: null,
    };
  }

  const [day, month, year, hour, minute] = toIntPair(state.parts);
  if ([day, month, year, hour, minute].some((n) => Number.isNaN(n))) {
    return { error: 'Enter a real date and time', iso: null };
  }

  const dt = DateTime.fromObject(
    { year, month, day, hour, minute },
    { zone: FORM_ZONE },
  );
  if (!dt.isValid) return { error: 'Enter a real date and time', iso: null };

  if (dt < DateTime.now().setZone(FORM_ZONE)) {
    return { error: 'Due date must be today or in the future', iso: null };
  }

  return { error: null, iso: dt.toUTC().toISO() };
}

function validateTaskForm({ title, description, status, due }) {
  const errors = {};

  const titleTrimmed = (title || '').trim();
  if (!titleTrimmed) errors.title = 'Enter a title';
  else if (titleTrimmed.length > 255) errors.title = 'Title must be 255 characters or fewer';

  if (!STATUS_VALUES.includes(status)) errors.status = 'Select a status';

  const dueResult = validateDue(due);
  if (dueResult.error) errors.due = dueResult.error;

  return {
    errors,
    value: {
      title: titleTrimmed,
      description: description || '',
      status,
      dueIso: dueResult.iso,
    },
  };
}

// Error summary order is non-negotiable for accessibility: the list must
// match the visual field order so each "skip to field" link lands in the
// reading sequence.
const FIELD_ORDER = ['title', 'status', 'due'];
const FIELD_ANCHORS = {
  title: '#title',
  status: '#status',
  due: '#due-day',
};

function buildErrorSummary(errors) {
  return FIELD_ORDER
    .filter((field) => errors[field])
    .map((field) => ({ text: errors[field], href: FIELD_ANCHORS[field] }));
}

module.exports = { validateTaskForm, validateDue, buildErrorSummary, STATUS_VALUES };
