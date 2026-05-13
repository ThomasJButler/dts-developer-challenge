'use strict';

const { DateTime } = require('luxon');

const DISPLAY_ZONE = 'Europe/London';
const DISPLAY_FORMAT = 'd LLLL yyyy, HH:mm';

const STATUS_PRESENTATION = {
  todo:        { statusLabel: 'To do',       statusTagClass: 'govuk-tag--grey' },
  in_progress: { statusLabel: 'In progress', statusTagClass: 'govuk-tag--blue' },
  done:        { statusLabel: 'Done',        statusTagClass: 'govuk-tag--green' },
};

function formatLondon(iso) {
  if (!iso) return null;
  const dt = DateTime.fromISO(iso, { zone: 'utc' });
  if (!dt.isValid) return null;
  return dt.setZone(DISPLAY_ZONE).toFormat(DISPLAY_FORMAT);
}

const EMPTY_DUE_PARTS = Object.freeze({
  day: '',
  month: '',
  year: '',
  hour: '',
  minute: '',
});

// Inverse of validateDue's ISO output: take a stored UTC due_at and
// produce the five string parts the GOV.UK date-input expects, in
// Europe/London. Used to pre-fill the edit form on the detail page so
// the existing date is visible the moment the form renders.
function splitDueParts(iso) {
  if (!iso) return { ...EMPTY_DUE_PARTS };
  const dt = DateTime.fromISO(iso, { zone: 'utc' });
  if (!dt.isValid) return { ...EMPTY_DUE_PARTS };
  const local = dt.setZone(DISPLAY_ZONE);
  const pad2 = (n) => String(n).padStart(2, '0');
  return {
    day: pad2(local.day),
    month: pad2(local.month),
    year: String(local.year),
    hour: pad2(local.hour),
    minute: pad2(local.minute),
  };
}

function presentTask(task) {
  const statusPresentation = STATUS_PRESENTATION[task.status] || {
    statusLabel: task.status,
    statusTagClass: 'govuk-tag--grey',
  };
  return {
    ...task,
    ...statusPresentation,
    dueLabel: formatLondon(task.due_at),
    createdLabel: formatLondon(task.created_at),
    updatedLabel: formatLondon(task.updated_at),
  };
}

// Sort comparators are total functions on the inputs we expect, so a
// stable JavaScript Array.prototype.sort gives us deterministic order.
// Tier 1: not-done before done. Tier 2: due ascending, no-date last among
// the not-done. Tier 3 (tiebreaker): created descending so the newest
// shows first when two tasks share a tier-2 slot.
function sortForList(tasks) {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'done' ? 1 : 0;
    const bDone = b.status === 'done' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    const aDue = a.due_at ? Date.parse(a.due_at) : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? Date.parse(b.due_at) : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    return Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
  });
}

module.exports = { presentTask, sortForList, formatLondon, splitDueParts };
