'use strict';

const { expect } = require('chai');

const { presentTask, sortForList } = require('../app/lib/task-presenter');

describe('presentTask', () => {
  it('maps status=todo to the grey "To do" tag', () => {
    const out = presentTask({
      id: 't1',
      title: 'x',
      status: 'todo',
      due_at: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    });
    expect(out.statusLabel).to.equal('To do');
    expect(out.statusTagClass).to.equal('govuk-tag--grey');
  });

  it('maps status=in_progress to the blue "In progress" tag', () => {
    const out = presentTask({
      id: 't1',
      title: 'x',
      status: 'in_progress',
      due_at: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    });
    expect(out.statusLabel).to.equal('In progress');
    expect(out.statusTagClass).to.equal('govuk-tag--blue');
  });

  it('maps status=done to the green "Done" tag', () => {
    const out = presentTask({
      id: 't1',
      title: 'x',
      status: 'done',
      due_at: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    });
    expect(out.statusLabel).to.equal('Done');
    expect(out.statusTagClass).to.equal('govuk-tag--green');
  });

  it('formats a May (BST) UTC due_at into Europe/London local time', () => {
    // 2026-05-20T09:00Z is BST (+1), so London local is 10:00.
    const out = presentTask({
      id: 't1',
      title: 'x',
      status: 'todo',
      due_at: '2026-05-20T09:00:00Z',
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    });
    expect(out.dueLabel).to.equal('20 May 2026, 10:00');
  });

  it('formats a December (GMT) UTC due_at without an offset shift', () => {
    const out = presentTask({
      id: 't1',
      title: 'x',
      status: 'todo',
      due_at: '2026-12-20T09:00:00Z',
      created_at: '2026-12-01T00:00:00Z',
      updated_at: '2026-12-01T00:00:00Z',
    });
    expect(out.dueLabel).to.equal('20 December 2026, 09:00');
  });

  it('returns null for dueLabel when due_at is null', () => {
    const out = presentTask({
      id: 't1',
      title: 'x',
      status: 'todo',
      due_at: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    });
    expect(out.dueLabel).to.equal(null);
  });

  it('also formats createdLabel and updatedLabel in Europe/London', () => {
    const out = presentTask({
      id: 't1',
      title: 'x',
      status: 'todo',
      due_at: null,
      created_at: '2026-05-12T14:30:00Z',
      updated_at: '2026-05-12T15:05:11Z',
    });
    expect(out.createdLabel).to.equal('12 May 2026, 15:30');
    expect(out.updatedLabel).to.equal('12 May 2026, 16:05');
  });
});

describe('sortForList', () => {
  it('puts done items last, then orders the rest by due date ascending', () => {
    const tasks = [
      { id: 'a', status: 'done',        due_at: '2026-05-01T00:00:00Z', created_at: '2026-04-01T00:00:00Z' },
      { id: 'b', status: 'todo',        due_at: '2026-05-20T00:00:00Z', created_at: '2026-05-08T00:00:00Z' },
      { id: 'c', status: 'in_progress', due_at: '2026-05-15T00:00:00Z', created_at: '2026-05-07T00:00:00Z' },
    ];
    expect(sortForList(tasks).map(t => t.id)).to.deep.equal(['c', 'b', 'a']);
  });

  it('puts items with no due date last among the not-done', () => {
    const tasks = [
      { id: 'a', status: 'todo',        due_at: null,                    created_at: '2026-05-01T00:00:00Z' },
      { id: 'b', status: 'todo',        due_at: '2026-05-20T00:00:00Z', created_at: '2026-05-08T00:00:00Z' },
    ];
    expect(sortForList(tasks).map(t => t.id)).to.deep.equal(['b', 'a']);
  });

  it('breaks ties on created_at descending (newest first)', () => {
    const tasks = [
      { id: 'older', status: 'todo', due_at: null, created_at: '2026-05-01T00:00:00Z' },
      { id: 'newer', status: 'todo', due_at: null, created_at: '2026-05-10T00:00:00Z' },
    ];
    expect(sortForList(tasks).map(t => t.id)).to.deep.equal(['newer', 'older']);
  });

  it('does not mutate the input array', () => {
    const tasks = [
      { id: 'a', status: 'done', due_at: null, created_at: '2026-04-01T00:00:00Z' },
      { id: 'b', status: 'todo', due_at: null, created_at: '2026-05-01T00:00:00Z' },
    ];
    const before = tasks.map(t => t.id);
    sortForList(tasks);
    expect(tasks.map(t => t.id)).to.deep.equal(before);
  });
});
