/* ---------------------------------------------------------------------------
   Manage your tasks - prototype app
   ---------------------------------------------------------------------------
   Production is server-rendered Nunjucks; this is a vanilla-JS stand-in so the
   design can be explored interactively. No frameworks, no router library.
   Keep all UI strings here so the design spec doc and the prototype agree.
--------------------------------------------------------------------------- */

(function () {
  'use strict';

  // ---- Microcopy --------------------------------------------------------
  const COPY = {
    list: {
      title: 'Your tasks',
      intro: 'Review and update the work items assigned to you. Tasks you create here are only visible to you.',
      createButton: 'Create a task',
      empty: {
        body: 'You have no tasks yet.',
        cta: 'Create your first task'
      },
      columns: { title: 'Title', status: 'Status', due: 'Due date', actions: 'Actions' },
      viewLink: 'View',
      visuallyHiddenView: function (ref) { return 'View task ' + ref; }
    },
    create: {
      title: 'Create a task',
      caption: 'Tasks',
      titleLabel: 'Title',
      titleHint: 'Use a short, specific description, for example "Review bundle for CR-2026-0142".',
      descriptionLabel: 'Description',
      descriptionHint: 'Add any context that will help future you. You can leave this blank.',
      statusLegend: 'Status',
      statusHint: 'New tasks usually start as "To do".',
      dueLegend: 'Due date and time (optional)',
      dueHint: 'For example, 20 5 2026 at 09 00. Leave blank if there is no deadline.',
      save: 'Save task',
      cancel: 'Cancel',
      errors: {
        summaryTitle: 'There is a problem',
        titleMissing: 'Enter a title',
        titleTooLong: 'Title must be 255 characters or fewer',
        statusUnknown: 'Select a status',
        dueIncomplete: 'Enter a complete date and time, or leave all date and time fields blank',
        dueInvalid: 'Enter a real date and time',
        duePast: 'Due date must be today or in the future'
      }
    },
    detail: {
      back: 'Back to your tasks',
      caption: function (ref) { return 'Task ' + ref; },
      summary: {
        reference: 'Reference',
        status: 'Status',
        due: 'Due',
        description: 'Description',
        created: 'Created',
        updated: 'Last updated',
        none: 'Not set'
      },
      updateLegend: 'Update status',
      updateHint: 'Changing status saves immediately.',
      updateSave: 'Save status',
      deleteHeading: 'Delete this task',
      deleteBody: 'Deleting removes the task and its history. This cannot be undone.',
      deleteButton: 'Delete this task',
      successBanner: {
        title: 'Success',
        heading: 'Status updated'
      }
    },
    confirm: {
      title: 'Are you sure you want to delete this task?',
      caption: function (ref) { return 'Task ' + ref; },
      body: 'The task will be permanently removed. You cannot undo this action.',
      delete: 'Yes, delete this task',
      cancel: 'No, keep this task'
    },
    statusLabels: { todo: 'To do', in_progress: 'In progress', done: 'Done' }
  };

  // ---- State ------------------------------------------------------------
  const STORAGE_KEY = 'hmcts-tasks-prototype-v1';
  const STATUSES = ['todo', 'in_progress', 'done'];

  function seed() {
    return [
      {
        id: 'CR-2026-0142',
        title: 'Review case bundle and flag missing exhibits',
        description: 'Defendant\u2019s solicitor sent the consolidated bundle late on Friday. Cross-check against the index and note any items not provided.',
        status: 'in_progress',
        due_at: '2026-05-20T08:00:00Z',
        created_at: '2026-05-08T09:12:00Z',
        updated_at: '2026-05-11T14:02:00Z'
      },
      {
        id: 'CR-2026-0138',
        title: 'Schedule directions hearing',
        description: 'Coordinate with the listing team for a 30-minute slot during the week of 25 May.',
        status: 'todo',
        due_at: '2026-05-22T13:30:00Z',
        created_at: '2026-05-07T11:30:00Z',
        updated_at: '2026-05-07T11:30:00Z'
      },
      {
        id: 'CR-2026-0151',
        title: 'Draft preliminary order for judicial review',
        description: '',
        status: 'todo',
        due_at: '2026-05-28T10:00:00Z',
        created_at: '2026-05-10T08:45:00Z',
        updated_at: '2026-05-10T08:45:00Z'
      },
      {
        id: 'CR-2026-0119',
        title: 'File acknowledgement of service',
        description: 'Confirm response filed with the court and update the index.',
        status: 'done',
        due_at: null,
        created_at: '2026-04-29T15:20:00Z',
        updated_at: '2026-05-09T09:05:00Z'
      }
    ];
  }

  let state;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const initial = seed();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(initial)); } catch (e) {}
    return initial;
  }
  function save(next) {
    state = next;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  state = load();

  // ---- Helpers ----------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === false || attrs[k] == null) return;
      else if (attrs[k] === true) node.setAttribute(k, '');
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // UK English date formatter: "20 May 2026, 09:00" (Europe/London)
  const MONTHS_EN_GB = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function formatDueLondon(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    // Use Intl with Europe/London to extract parts.
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    const get = function (type) { const p = parts.find(function (x) { return x.type === type; }); return p ? p.value : ''; };
    return get('day') + ' ' + get('month') + ' ' + get('year') + ', ' + get('hour') + ':' + get('minute');
  }
  function formatTimestampLondon(iso) {
    return formatDueLondon(iso); // same format for created/updated
  }

  function statusTag(status) {
    const label = COPY.statusLabels[status] || status;
    let cls = 'govuk-tag govuk-tag--grey';
    if (status === 'in_progress') cls = 'govuk-tag govuk-tag--blue';
    else if (status === 'done') cls = 'govuk-tag govuk-tag--green';
    const span = el('strong', { class: cls }, [label]);
    return span;
  }

  // ---- Router -----------------------------------------------------------
  // Routes:
  //   #/tasks                - list
  //   #/tasks/new            - create
  //   #/tasks/new?errors     - create, validation error state
  //   #/tasks/:id            - detail
  //   #/tasks/:id?updated    - detail with success banner
  //   #/tasks/:id/delete     - delete confirmation

  function parseHash() {
    let h = location.hash || '#/tasks';
    if (h.charAt(0) === '#') h = h.slice(1);
    const qIdx = h.indexOf('?');
    const path = qIdx === -1 ? h : h.slice(0, qIdx);
    const queryStr = qIdx === -1 ? '' : h.slice(qIdx + 1);
    const query = {};
    queryStr.split('&').filter(Boolean).forEach(function (kv) {
      const i = kv.indexOf('=');
      const k = i === -1 ? kv : kv.slice(0, i);
      const v = i === -1 ? '' : decodeURIComponent(kv.slice(i + 1));
      query[k] = v;
    });
    return { path: path, query: query };
  }

  function navigate(to) {
    if (location.hash === '#' + to) {
      render();
    } else {
      location.hash = to;
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function render() {
    const { path, query } = parseHash();
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (path === '' || path === '/' || path === '/tasks') {
      app.appendChild(renderList(query));
    } else if (path === '/tasks/new') {
      app.appendChild(renderCreate(query));
    } else if (/^\/tasks\/[^/]+\/delete$/.test(path)) {
      const id = path.split('/')[2];
      app.appendChild(renderDeleteConfirm(id));
    } else if (/^\/tasks\/[^/]+$/.test(path)) {
      const id = path.split('/')[2];
      app.appendChild(renderDetail(id, query));
    } else {
      app.appendChild(renderNotFound());
    }

    // Focus management: move focus to the main heading on every navigation
    // so screen-reader users hear where they are. Error summary takes
    // precedence (handled inside renderCreate).
    const errorSummary = $('.govuk-error-summary');
    if (errorSummary) {
      errorSummary.focus();
    } else {
      const h1 = $('#main-content h1');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        try { h1.focus({ preventScroll: true }); } catch (e) { h1.focus(); }
      }
    }
  }

  window.addEventListener('hashchange', render);

  // ---- Screen: Task list -----------------------------------------------
  function renderList() {
    const wrap = el('div', { class: 'govuk-grid-row' });
    const col = el('div', { class: 'govuk-grid-column-two-thirds-from-desktop govuk-grid-column-full' });
    wrap.appendChild(col);

    const headingRow = el('div', { class: 'heading-row govuk-!-margin-bottom-6' });
    const titleBlock = el('div', null, [
      el('h1', { class: 'govuk-heading-xl heading-row__title' }, [COPY.list.title])
    ]);
    headingRow.appendChild(titleBlock);

    if (state.length > 0) {
      const createBtn = el('a', {
        href: '#/tasks/new',
        role: 'button',
        draggable: 'false',
        class: 'govuk-button',
        'data-module': 'govuk-button'
      }, [COPY.list.createButton]);
      headingRow.appendChild(createBtn);
    }

    col.appendChild(headingRow);
    col.appendChild(el('p', { class: 'govuk-body-l' }, [COPY.list.intro]));

    if (state.length === 0) {
      const inset = el('div', { class: 'govuk-inset-text govuk-!-margin-top-6' }, [
        el('p', { class: 'govuk-body' }, [COPY.list.empty.body]),
        el('a', {
          href: '#/tasks/new',
          role: 'button',
          draggable: 'false',
          class: 'govuk-button govuk-!-margin-bottom-0',
          'data-module': 'govuk-button'
        }, [COPY.list.empty.cta])
      ]);
      col.appendChild(inset);
      return wrap;
    }

    // Sort: not done first, then by due date ascending (nulls last), then by created
    const sorted = state.slice().sort(function (a, b) {
      const ad = a.status === 'done' ? 1 : 0;
      const bd = b.status === 'done' ? 1 : 0;
      if (ad !== bd) return ad - bd;
      const au = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const bu = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      if (au !== bu) return au - bu;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const table = el('table', { class: 'govuk-table task-table' });
    const caption = el('caption', { class: 'govuk-table__caption govuk-visually-hidden' }, ['Your tasks, ' + state.length + ' total']);
    table.appendChild(caption);
    const thead = el('thead', { class: 'govuk-table__head' });
    const trh = el('tr', { class: 'govuk-table__row' });
    [COPY.list.columns.title, COPY.list.columns.status, COPY.list.columns.due, COPY.list.columns.actions].forEach(function (h, i) {
      const th = el('th', { class: 'govuk-table__header', scope: 'col' }, [h]);
      if (i === 3) th.classList.add('govuk-table__header--numeric'); // actions right-align on desktop? we'll keep left
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = el('tbody', { class: 'govuk-table__body' });

    sorted.forEach(function (t) {
      const tr = el('tr', { class: 'govuk-table__row' });
      const titleCell = el('td', { class: 'govuk-table__cell', 'data-label': COPY.list.columns.title });
      const link = el('a', { class: 'govuk-link govuk-link--no-visited-state', href: '#/tasks/' + encodeURIComponent(t.id) }, [t.title]);
      const ref = el('span', { class: 'govuk-hint govuk-!-margin-bottom-0 govuk-!-font-size-16' }, [t.id]);
      titleCell.appendChild(link);
      titleCell.appendChild(ref);
      tr.appendChild(titleCell);

      const statusCell = el('td', { class: 'govuk-table__cell', 'data-label': COPY.list.columns.status });
      statusCell.appendChild(statusTag(t.status));
      tr.appendChild(statusCell);

      const dueCell = el('td', { class: 'govuk-table__cell', 'data-label': COPY.list.columns.due });
      dueCell.textContent = t.due_at ? formatDueLondon(t.due_at) : 'Not set';
      tr.appendChild(dueCell);

      const actionsCell = el('td', { class: 'govuk-table__cell', 'data-label': COPY.list.columns.actions });
      const viewLink = el('a', {
        class: 'govuk-link govuk-link--no-visited-state',
        href: '#/tasks/' + encodeURIComponent(t.id)
      }, [
        COPY.list.viewLink,
        el('span', { class: 'govuk-visually-hidden' }, [' ' + t.id])
      ]);
      actionsCell.appendChild(viewLink);
      tr.appendChild(actionsCell);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    col.appendChild(table);

    return wrap;
  }

  // ---- Screen: Create task ---------------------------------------------
  function renderCreate(query) {
    const wrap = el('div', { class: 'govuk-grid-row' });
    const col = el('div', { class: 'govuk-grid-column-two-thirds' });
    wrap.appendChild(col);

    // Back link
    col.appendChild(el('a', { class: 'govuk-back-link', href: '#/tasks' }, [COPY.detail.back]));

    // We hold form values in a closure. If demo "error state" was requested,
    // pre-populate with a known invalid set so the error summary renders.
    const initial = {
      title: query.errors === '1' ? '' : '',
      description: query.errors === '1' ? 'Late bundle from defence team; need to chase exhibits.' : '',
      status: query.errors === '1' ? '' : 'todo',
      'due-day': query.errors === '1' ? '32' : '',
      'due-month': query.errors === '1' ? '5' : '',
      'due-year': query.errors === '1' ? '2026' : '',
      'due-hour': query.errors === '1' ? '09' : '',
      'due-minute': query.errors === '1' ? '00' : ''
    };

    let errors = query.errors === '1' ? validate(initial) : {};
    const showErrors = Object.keys(errors).length > 0;

    const form = el('form', {
      class: 'govuk-form',
      novalidate: true,
      onsubmit: function (e) {
        e.preventDefault();
        const values = collectForm(form);
        const result = validate(values);
        errors = result;
        if (Object.keys(errors).length === 0) {
          const id = newRef();
          const now = new Date().toISOString();
          const t = {
            id: id,
            title: values.title.trim(),
            description: (values.description || '').trim(),
            status: values.status,
            due_at: assembleIso(values),
            created_at: now,
            updated_at: now
          };
          save(state.concat([t]));
          navigate('/tasks/' + encodeURIComponent(id) + '?created=1');
        } else {
          // Re-render in error state, preserving values
          location.hash = '/tasks/new?errors=1';
          // Hash didn't change - force re-render
          render();
        }
      }
    });

    // Caption + heading
    form.appendChild(el('span', { class: 'govuk-caption-l' }, [COPY.create.caption]));
    form.appendChild(el('h1', { class: 'govuk-heading-l' }, [COPY.create.title]));

    // Error summary
    if (showErrors) {
      const summary = el('div', {
        class: 'govuk-error-summary',
        'data-module': 'govuk-error-summary',
        tabindex: '-1'
      });
      summary.appendChild(el('div', { role: 'alert' }, [
        el('h2', { class: 'govuk-error-summary__title' }, [COPY.create.errors.summaryTitle]),
        el('div', { class: 'govuk-error-summary__body' }, [
          (function () {
            const ul = el('ul', { class: 'govuk-list govuk-error-summary__list' });
            ERROR_ORDER.forEach(function (key) {
              if (!errors[key]) return;
              const li = el('li', null, [
                el('a', { href: '#' + errorAnchor(key) }, [errors[key]])
              ]);
              ul.appendChild(li);
            });
            return ul;
          })()
        ])
      ]));
      form.appendChild(summary);
    }

    // Title field
    form.appendChild(fieldText({
      id: 'title', name: 'title', label: COPY.create.titleLabel,
      hint: COPY.create.titleHint, value: initial.title, error: errors.title,
      autocomplete: 'off', maxlength: 255, required: true,
      labelClass: 'govuk-label--m'
    }));

    // Description field
    form.appendChild(fieldTextarea({
      id: 'description', name: 'description', label: COPY.create.descriptionLabel,
      hint: COPY.create.descriptionHint, value: initial.description, rows: 5,
      labelClass: 'govuk-label--m'
    }));

    // Status field - radios
    form.appendChild(fieldRadios({
      id: 'status', name: 'status', legend: COPY.create.statusLegend, hint: COPY.create.statusHint,
      value: initial.status, error: errors.status,
      options: [
        { value: 'todo', label: COPY.statusLabels.todo },
        { value: 'in_progress', label: COPY.statusLabels.in_progress },
        { value: 'done', label: COPY.statusLabels.done }
      ]
    }));

    // Due date + time
    form.appendChild(fieldDateTime({
      id: 'due', legend: COPY.create.dueLegend, hint: COPY.create.dueHint,
      values: initial, error: errors.due
    }));

    // Buttons
    const buttons = el('div', { class: 'govuk-button-group' }, [
      el('button', { type: 'submit', class: 'govuk-button', 'data-module': 'govuk-button' }, [COPY.create.save]),
      el('a', { class: 'govuk-link', href: '#/tasks' }, [COPY.create.cancel])
    ]);
    form.appendChild(buttons);

    col.appendChild(form);
    return wrap;
  }

  const ERROR_ORDER = ['title', 'status', 'due'];
  function errorAnchor(key) {
    if (key === 'title') return 'title';
    if (key === 'status') return 'status';
    if (key === 'due') return 'due-day';
    return key;
  }

  function collectForm(form) {
    const out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'radio') {
        if (el.checked) out[el.name] = el.value;
        else if (!(el.name in out)) out[el.name] = '';
      } else {
        out[el.name] = el.value;
      }
    });
    return out;
  }

  function validate(v) {
    const e = {};
    const title = (v.title || '').trim();
    if (!title) e.title = COPY.create.errors.titleMissing;
    else if (title.length > 255) e.title = COPY.create.errors.titleTooLong;

    if (!v.status || STATUSES.indexOf(v.status) === -1) {
      e.status = COPY.create.errors.statusUnknown;
    }

    const d = v['due-day'], m = v['due-month'], y = v['due-year'], hh = v['due-hour'], mm = v['due-minute'];
    const someFilled = [d, m, y, hh, mm].some(function (x) { return x && String(x).length > 0; });
    const allFilled = [d, m, y, hh, mm].every(function (x) { return x && String(x).length > 0; });
    if (someFilled && !allFilled) {
      e.due = COPY.create.errors.dueIncomplete;
    } else if (allFilled) {
      const dn = parseInt(d, 10), mn = parseInt(m, 10), yn = parseInt(y, 10);
      const hn = parseInt(hh, 10), min = parseInt(mm, 10);
      if (isNaN(dn) || isNaN(mn) || isNaN(yn) || isNaN(hn) || isNaN(min) ||
          dn < 1 || dn > 31 || mn < 1 || mn > 12 || yn < 2000 || yn > 2100 ||
          hn < 0 || hn > 23 || min < 0 || min > 59) {
        e.due = COPY.create.errors.dueInvalid;
      } else {
        const dt = new Date(Date.UTC(yn, mn - 1, dn, hn, min));
        if (dt.getUTCFullYear() !== yn || dt.getUTCMonth() !== (mn - 1) || dt.getUTCDate() !== dn) {
          e.due = COPY.create.errors.dueInvalid;
        }
      }
    }
    return e;
  }

  function assembleIso(v) {
    if (!v['due-day']) return null;
    const dn = parseInt(v['due-day'], 10), mn = parseInt(v['due-month'], 10), yn = parseInt(v['due-year'], 10);
    const hn = parseInt(v['due-hour'], 10), min = parseInt(v['due-minute'], 10);
    // Treat the local time the user typed as Europe/London local, but for simplicity
    // of this prototype we store it as UTC of those numbers. Production code would
    // convert Europe/London local to UTC using a library like luxon.
    return new Date(Date.UTC(yn, mn - 1, dn, hn, min)).toISOString();
  }

  function newRef() {
    // Generate a fake case-style reference for prototype data.
    const year = new Date().getFullYear();
    const n = Math.floor(Math.random() * 900 + 100);
    return 'CR-' + year + '-0' + n;
  }

  // ---- Form field builders ----------------------------------------------
  function fieldText(opts) {
    const wrapClass = 'govuk-form-group' + (opts.error ? ' govuk-form-group--error' : '');
    const wrap = el('div', { class: wrapClass });
    const label = el('label', { class: 'govuk-label ' + (opts.labelClass || ''), for: opts.id }, [opts.label]);
    wrap.appendChild(label);
    if (opts.hint) wrap.appendChild(el('div', { class: 'govuk-hint', id: opts.id + '-hint' }, [opts.hint]));
    if (opts.error) {
      wrap.appendChild(el('p', { class: 'govuk-error-message', id: opts.id + '-error' }, [
        el('span', { class: 'govuk-visually-hidden' }, ['Error: ']),
        opts.error
      ]));
    }
    const describedBy = [];
    if (opts.hint) describedBy.push(opts.id + '-hint');
    if (opts.error) describedBy.push(opts.id + '-error');
    const input = el('input', {
      class: 'govuk-input' + (opts.error ? ' govuk-input--error' : ''),
      id: opts.id, name: opts.name, type: 'text',
      value: opts.value || '',
      autocomplete: opts.autocomplete || 'off',
      maxlength: opts.maxlength,
      'aria-describedby': describedBy.length ? describedBy.join(' ') : null,
      'aria-invalid': opts.error ? 'true' : null
    });
    wrap.appendChild(input);
    return wrap;
  }

  function fieldTextarea(opts) {
    const wrap = el('div', { class: 'govuk-form-group' });
    wrap.appendChild(el('label', { class: 'govuk-label ' + (opts.labelClass || ''), for: opts.id }, [opts.label]));
    if (opts.hint) wrap.appendChild(el('div', { class: 'govuk-hint', id: opts.id + '-hint' }, [opts.hint]));
    const ta = el('textarea', {
      class: 'govuk-textarea',
      id: opts.id, name: opts.name,
      rows: opts.rows || 5,
      'aria-describedby': opts.hint ? opts.id + '-hint' : null
    });
    ta.value = opts.value || '';
    wrap.appendChild(ta);
    return wrap;
  }

  function fieldRadios(opts) {
    const wrapClass = 'govuk-form-group' + (opts.error ? ' govuk-form-group--error' : '');
    const wrap = el('div', { class: wrapClass });
    const fieldset = el('fieldset', { class: 'govuk-fieldset', 'aria-describedby': [opts.hint ? opts.id + '-hint' : null, opts.error ? opts.id + '-error' : null].filter(Boolean).join(' ') || null });
    fieldset.appendChild(el('legend', { class: 'govuk-fieldset__legend govuk-fieldset__legend--m' }, [opts.legend]));
    if (opts.hint) fieldset.appendChild(el('div', { class: 'govuk-hint', id: opts.id + '-hint' }, [opts.hint]));
    if (opts.error) fieldset.appendChild(el('p', { class: 'govuk-error-message', id: opts.id + '-error' }, [
      el('span', { class: 'govuk-visually-hidden' }, ['Error: ']),
      opts.error
    ]));
    const radios = el('div', { class: 'govuk-radios', 'data-module': 'govuk-radios' });
    opts.options.forEach(function (o, i) {
      const itemId = i === 0 ? opts.id : opts.id + '-' + (i + 1);
      const item = el('div', { class: 'govuk-radios__item' }, [
        el('input', { class: 'govuk-radios__input', id: itemId, name: opts.name, type: 'radio', value: o.value, checked: o.value === opts.value ? true : false }),
        el('label', { class: 'govuk-label govuk-radios__label', for: itemId }, [o.label])
      ]);
      radios.appendChild(item);
    });
    fieldset.appendChild(radios);
    wrap.appendChild(fieldset);
    return wrap;
  }

  function fieldDateTime(opts) {
    const wrapClass = 'govuk-form-group' + (opts.error ? ' govuk-form-group--error' : '');
    const wrap = el('div', { class: wrapClass });
    const describedBy = [];
    if (opts.hint) describedBy.push(opts.id + '-hint');
    if (opts.error) describedBy.push(opts.id + '-error');

    const fieldset = el('fieldset', {
      class: 'govuk-fieldset',
      role: 'group',
      'aria-describedby': describedBy.length ? describedBy.join(' ') : null
    });
    fieldset.appendChild(el('legend', { class: 'govuk-fieldset__legend govuk-fieldset__legend--m' }, [opts.legend]));
    if (opts.hint) fieldset.appendChild(el('div', { class: 'govuk-hint', id: opts.id + '-hint' }, [opts.hint]));
    if (opts.error) fieldset.appendChild(el('p', { class: 'govuk-error-message', id: opts.id + '-error' }, [
      el('span', { class: 'govuk-visually-hidden' }, ['Error: ']),
      opts.error
    ]));

    const dateInputs = el('div', { class: 'govuk-date-input', id: opts.id });
    function part(name, label, width, value) {
      const item = el('div', { class: 'govuk-date-input__item' }, [
        el('div', { class: 'govuk-form-group' }, [
          el('label', { class: 'govuk-label govuk-date-input__label', for: opts.id + '-' + name }, [label]),
          el('input', {
            class: 'govuk-input govuk-date-input__input ' + width + (opts.error ? ' govuk-input--error' : ''),
            id: opts.id + '-' + name,
            name: opts.id + '-' + name,
            type: 'text',
            inputmode: 'numeric',
            value: value || ''
          })
        ])
      ]);
      return item;
    }
    dateInputs.appendChild(part('day', 'Day', 'govuk-input--width-2', opts.values['due-day']));
    dateInputs.appendChild(part('month', 'Month', 'govuk-input--width-2', opts.values['due-month']));
    dateInputs.appendChild(part('year', 'Year', 'govuk-input--width-4', opts.values['due-year']));
    // Visual separator for time
    const timeWrap = el('div', { class: 'govuk-date-input__item', style: 'margin-left: 12px;' }, [
      el('div', { class: 'govuk-form-group' }, [
        el('label', { class: 'govuk-label govuk-date-input__label', for: opts.id + '-hour' }, ['Hour']),
        el('input', {
          class: 'govuk-input govuk-date-input__input govuk-input--width-2' + (opts.error ? ' govuk-input--error' : ''),
          id: opts.id + '-hour', name: opts.id + '-hour', type: 'text', inputmode: 'numeric',
          value: opts.values['due-hour'] || ''
        })
      ])
    ]);
    const minWrap = el('div', { class: 'govuk-date-input__item' }, [
      el('div', { class: 'govuk-form-group' }, [
        el('label', { class: 'govuk-label govuk-date-input__label', for: opts.id + '-minute' }, ['Minute']),
        el('input', {
          class: 'govuk-input govuk-date-input__input govuk-input--width-2' + (opts.error ? ' govuk-input--error' : ''),
          id: opts.id + '-minute', name: opts.id + '-minute', type: 'text', inputmode: 'numeric',
          value: opts.values['due-minute'] || ''
        })
      ])
    ]);
    dateInputs.appendChild(timeWrap);
    dateInputs.appendChild(minWrap);

    fieldset.appendChild(dateInputs);
    wrap.appendChild(fieldset);
    return wrap;
  }

  // ---- Screen: Task detail ---------------------------------------------
  function renderDetail(id, query) {
    const t = state.find(function (x) { return x.id === id; });
    if (!t) return renderNotFound();
    const showSuccess = query.updated === '1' || query.created === '1';
    const successHeading = query.created === '1' ? 'Task created' : 'Status updated';

    const wrap = el('div', { class: 'govuk-grid-row' });
    const col = el('div', { class: 'govuk-grid-column-two-thirds' });
    wrap.appendChild(col);

    col.appendChild(el('a', { class: 'govuk-back-link', href: '#/tasks' }, [COPY.detail.back]));

    if (showSuccess) {
      const banner = el('div', {
        class: 'govuk-notification-banner govuk-notification-banner--success',
        role: 'alert',
        'aria-labelledby': 'notif-title',
        'data-module': 'govuk-notification-banner',
        tabindex: '-1'
      }, [
        el('div', { class: 'govuk-notification-banner__header' }, [
          el('h2', { class: 'govuk-notification-banner__title', id: 'notif-title' }, [COPY.detail.successBanner.title])
        ]),
        el('div', { class: 'govuk-notification-banner__content' }, [
          el('h3', { class: 'govuk-notification-banner__heading' }, [successHeading])
        ])
      ]);
      col.appendChild(banner);
      setTimeout(function () { try { banner.focus(); } catch (e) {} }, 50);
    }

    col.appendChild(el('span', { class: 'govuk-caption-l' }, [COPY.detail.caption(t.id)]));
    col.appendChild(el('h1', { class: 'govuk-heading-l' }, [t.title]));

    // Summary list
    const summary = el('dl', { class: 'govuk-summary-list' });
    function row(label, valueNode) {
      const r = el('div', { class: 'govuk-summary-list__row' }, [
        el('dt', { class: 'govuk-summary-list__key' }, [label]),
        el('dd', { class: 'govuk-summary-list__value' })
      ]);
      r.lastChild.appendChild(typeof valueNode === 'string' ? document.createTextNode(valueNode) : valueNode);
      return r;
    }
    summary.appendChild(row(COPY.detail.summary.reference, t.id));
    summary.appendChild(row(COPY.detail.summary.status, statusTag(t.status)));
    summary.appendChild(row(COPY.detail.summary.due, t.due_at ? formatDueLondon(t.due_at) : COPY.detail.summary.none));
    summary.appendChild(row(COPY.detail.summary.description, t.description || COPY.detail.summary.none));
    summary.appendChild(row(COPY.detail.summary.created, formatTimestampLondon(t.created_at)));
    summary.appendChild(row(COPY.detail.summary.updated, formatTimestampLondon(t.updated_at)));
    col.appendChild(summary);

    // Update status form
    const updateForm = el('form', {
      class: 'govuk-form govuk-!-margin-top-8',
      onsubmit: function (e) {
        e.preventDefault();
        const fd = collectForm(updateForm);
        if (STATUSES.indexOf(fd['status-update']) === -1) return;
        const next = state.map(function (x) {
          if (x.id !== id) return x;
          return Object.assign({}, x, { status: fd['status-update'], updated_at: new Date().toISOString() });
        });
        save(next);
        navigate('/tasks/' + encodeURIComponent(id) + '?updated=1');
      }
    });
    updateForm.appendChild(fieldRadios({
      id: 'status-update', name: 'status-update',
      legend: COPY.detail.updateLegend,
      hint: COPY.detail.updateHint,
      value: t.status,
      options: [
        { value: 'todo', label: COPY.statusLabels.todo },
        { value: 'in_progress', label: COPY.statusLabels.in_progress },
        { value: 'done', label: COPY.statusLabels.done }
      ]
    }));
    updateForm.appendChild(el('button', { type: 'submit', class: 'govuk-button', 'data-module': 'govuk-button' }, [COPY.detail.updateSave]));
    col.appendChild(updateForm);

    // Delete section
    col.appendChild(el('hr', { class: 'govuk-section-break govuk-section-break--m govuk-section-break--visible' }));
    col.appendChild(el('h2', { class: 'govuk-heading-m' }, [COPY.detail.deleteHeading]));
    col.appendChild(el('p', { class: 'govuk-body' }, [COPY.detail.deleteBody]));
    const deleteForm = el('form', { action: '#/tasks/' + encodeURIComponent(id) + '/delete', method: 'get' }, [
      el('a', {
        href: '#/tasks/' + encodeURIComponent(id) + '/delete',
        role: 'button',
        draggable: 'false',
        class: 'govuk-button govuk-button--warning',
        'data-module': 'govuk-button'
      }, [COPY.detail.deleteButton])
    ]);
    col.appendChild(deleteForm);

    return wrap;
  }

  // ---- Screen: Delete confirmation -------------------------------------
  function renderDeleteConfirm(id) {
    const t = state.find(function (x) { return x.id === id; });
    if (!t) return renderNotFound();

    const wrap = el('div', { class: 'govuk-grid-row' });
    const col = el('div', { class: 'govuk-grid-column-two-thirds' });
    wrap.appendChild(col);

    col.appendChild(el('a', { class: 'govuk-back-link', href: '#/tasks/' + encodeURIComponent(id) }, ['Back to task']));
    col.appendChild(el('span', { class: 'govuk-caption-l' }, [COPY.confirm.caption(t.id)]));
    col.appendChild(el('h1', { class: 'govuk-heading-l' }, [COPY.confirm.title]));
    col.appendChild(el('p', { class: 'govuk-body' }, [COPY.confirm.body]));

    const form = el('form', {
      onsubmit: function (e) {
        e.preventDefault();
        const next = state.filter(function (x) { return x.id !== id; });
        save(next);
        navigate('/tasks?deleted=' + encodeURIComponent(t.id));
      }
    });
    const group = el('div', { class: 'govuk-button-group' }, [
      el('button', { type: 'submit', class: 'govuk-button govuk-button--warning', 'data-module': 'govuk-button' }, [COPY.confirm.delete]),
      el('a', { class: 'govuk-link', href: '#/tasks/' + encodeURIComponent(id) }, [COPY.confirm.cancel])
    ]);
    form.appendChild(group);
    col.appendChild(form);
    return wrap;
  }

  // ---- Not found --------------------------------------------------------
  function renderNotFound() {
    const wrap = el('div', { class: 'govuk-grid-row' });
    const col = el('div', { class: 'govuk-grid-column-two-thirds' });
    wrap.appendChild(col);
    col.appendChild(el('h1', { class: 'govuk-heading-l' }, ['Task not found']));
    col.appendChild(el('p', { class: 'govuk-body' }, ['That task may have been deleted, or the link is incorrect.']));
    col.appendChild(el('a', { class: 'govuk-link', href: '#/tasks' }, ['Return to your tasks']));
    return wrap;
  }

  // ---- Demo toolbar -----------------------------------------------------
  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('[data-demo]');
    if (!btn) return;
    const action = btn.getAttribute('data-demo');
    if (action === 'empty') {
      save([]);
      navigate('/tasks');
    } else if (action === 'seed') {
      save(seed());
      navigate('/tasks');
    } else if (action === 'error') {
      save(state.length === 0 ? seed() : state);
      navigate('/tasks/new?errors=1');
    } else if (action === 'success') {
      save(state.length === 0 ? seed() : state);
      const first = state[0];
      navigate('/tasks/' + encodeURIComponent(first.id) + '?updated=1');
    }
  });

  // Boot
  if (!location.hash) location.hash = '/tasks';
  render();
})();
