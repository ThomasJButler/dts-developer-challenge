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

module.exports = { presentTask, sortForList, formatLondon };
