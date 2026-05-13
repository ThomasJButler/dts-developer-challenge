# Handoff: Manage your tasks (HMCTS caseworker task tool)

## Overview

A small internal tool for HMCTS caseworkers to manage their own work items. Single-user view; no authentication in scope. Users create, list, update the status of, and delete tasks. Nothing more.

## About the design files

The files in this bundle are **design references created in HTML** — clickable prototypes showing intended look and behaviour, plus an annotated design specification. They are **not production code to copy directly**.

The production target is fixed by the brief:

- **Server-rendered Nunjucks templates consumed by an Express app.**
- **GOV.UK Frontend** (the official `govuk-frontend` npm package, current major version) for components, spacing, typography, and colour palette.
- **No React, no Vue, no client-side router.** Progressive enhancement only. Forms POST to URLs and the server returns full HTML.
- **WCAG 2.2 AA** minimum.

Your task is to recreate the designs in that environment using the GOV.UK Frontend macros. `spec.html` already contains annotated Nunjucks for every screen — that is your starting point. The vanilla-JS prototype exists only so you can interact with the design; do not port the JavaScript.

## Fidelity

**High-fidelity.** GOV.UK Frontend handles the pixel-level styling, so this handoff specifies component choices, content, layout, interaction, and validation. Where deviations from the default GOV.UK Frontend appearance exist (the plain black service header, the narrow-width table fallback), they are documented below.

## Files in this bundle

| File | Purpose |
|---|---|
| `index.html` | Landing page linking the prototype and the spec. |
| `prototype.html` + `prototype.js` | Clickable prototype of all screens and states. Open `prototype.html` in a browser. Use the toolbar at the top to jump to empty, error, and success states. |
| `spec.html` | **The primary build reference.** Annotated Nunjucks for every screen, rationale per choice, full UK English microcopy, accessibility checklist, and out-of-scope list. |
| `sample_data.json` | Fixtures used by the prototype. Use these for your dev seed data. |
| `screenshots/` | PNG captures of every screen state, in build order. |

Open `index.html` first.

## Screen states (in `screenshots/`)

| # | File | Shows |
|---|---|---|
| 1 | `01-list-with-tasks.png` | Task list with seeded tasks, default sort. |
| 2 | `02-list-empty-state.png` | Empty-state inset panel and primary CTA. |
| 3 | `03-create-task-form.png` | Create form, default values, no errors. |
| 4 | `04-create-task-with-errors.png` | Create form with `govukErrorSummary` and inline errors; previously-entered values preserved. |
| 5 | `05-task-detail.png` | Detail page with summary list, update-status form, and warning button. |
| 6 | `06-task-detail-status-updated.png` | Detail page with success `govukNotificationBanner` after a status change. |
| 7 | `07-delete-confirmation.png` | Standalone confirmation page with destructive primary and cancel link. |

## Production stack

Recommended package versions (or whatever the team's current pin is):

```
express              ^4.19
nunjucks             ^3.2
govuk-frontend       ^5.7
express-session      ^1.18      // for flash messages
csurf or equivalent  ^1.x       // CSRF on POST forms
luxon                ^3.4       // Europe/London date formatting
zod or joi           latest     // server-side validation
```

No bundler is required. Serve the `govuk-frontend/dist/govuk/assets` folder statically. Compile or pre-compile the SCSS once; do not ship CSS-in-JS.

## Routes

| Method | Path | Handler responsibility |
|---|---|---|
| `GET`  | `/tasks` | Render the task list. Pass `tasks` and any `flash` flags. |
| `GET`  | `/tasks/new` | Render the empty create form. |
| `POST` | `/tasks` | Validate; on success create the task, then **303 redirect** to `/tasks/:id` with a `created` flash. On failure, re-render `/tasks/new` with `errors` and `values`. |
| `GET`  | `/tasks/:id` | Render the detail page. Pass `task` and any `flash` flags. 404 if not found. |
| `POST` | `/tasks/:id/status` | Validate the status value; update; **303 redirect** to `/tasks/:id` with a `statusUpdated` flash. |
| `GET`  | `/tasks/:id/delete` | Render the delete confirmation page. |
| `POST` | `/tasks/:id/delete` | Delete; **303 redirect** to `/tasks` with a `deleted` flash. |

POST/Redirect/GET on every mutation, so refresh never resubmits.

## Task model

```
title         string,  required, 1-255 chars
description   string,  optional
status        enum,    one of: "todo" | "in_progress" | "done"
due_at        ISO 8601 UTC string, optional
created_at    ISO 8601 UTC string, read-only
updated_at    ISO 8601 UTC string, read-only
```

Display rules:

- `due_at`, `created_at`, `updated_at` render in **Europe/London**, format `D MMMM YYYY, HH:mm` (e.g. `20 May 2026, 09:00`). Use Luxon: `dt.setZone('Europe/London').toFormat('d LLLL yyyy, HH:mm')`.
- Status maps to a GOV.UK tag:

| status | label | tag class |
|---|---|---|
| `todo` | To do | `govuk-tag--grey` |
| `in_progress` | In progress | `govuk-tag--blue` |
| `done` | Done | `govuk-tag--green` |

The tag text label is always present alongside the colour, so the colour is never the sole signal.

## Screens

For each screen, the annotated Nunjucks is in `spec.html`. The bullet points below are the build summary; treat the spec as the source of truth for markup.

### 1. Task list (`/tasks`)

- **Layout.** Two-thirds-width column on desktop; full-width below 768px. H1 `Your tasks` (`govuk-heading-xl`), intro paragraph (`govuk-body-l`), then the table.
- **Heading row.** Title on the left, "Create a task" primary button on the right on desktop. Below 641px the button drops below the heading and is full width. Hide the button entirely in the empty state.
- **Empty state.** `govuk-inset-text` with `You have no tasks yet.` and a primary button `Create your first task`.
- **Table.** `govukTable` with four columns: Title, Status, Due date, Actions. The title cell holds an anchor to `/tasks/:id` plus a small grey reference (`CR-2026-0142`) under it. The actions cell has a `View` link with a visually-hidden suffix carrying the reference, so each link has a unique accessible name.
- **Narrow-width fallback.** Below 641px, the table degrades to stacked, labelled cards using `data-label` attributes on each cell and a small CSS rule. The semantics stay table semantics. See `prototype.html` styles for the exact CSS (look for `.task-table` in the `<style>` block).
- **Default sort.** Not-done first, then due-date ascending with no-date items last, then created descending. Sort is server-side; not user-configurable.

### 2. Create a task (`/tasks/new`)

- **Layout.** Two-thirds column. Back link `Back to your tasks`, caption `Tasks`, H1 `Create a task` (`govuk-heading-l`). Then the form.
- **Fields, in order:** Title (`govukInput`, required, `maxlength=255`, `autocomplete="off"`), Description (`govukTextarea`, optional, 5 rows), Status (`govukRadios`, three options, default `todo`), Due date and time (`govukDateInput` extended to five items: day, month, year, hour, minute). One legend, one hint, one error message for the date-and-time group.
- **Buttons.** `Save task` primary submit + `Cancel` link to `/tasks`, both inside a `govuk-button-group`.
- **Error state.** `govukErrorSummary` at the top of `<main>`, focused on render. Error list in field order. Each summary link targets the first input id of the field: `#title`, `#status`, `#due-day`. Inline `govuk-error-message` next to each offending field, prefixed with a visually-hidden `Error:`. The `<title>` is prefixed with `Error: ` so screen readers and tab titles announce the failure on page load. Every previously-entered value is preserved.
- **`novalidate`** on the `<form>` so the server, not the browser, owns the validation messages.

### 3. Task detail (`/tasks/:id`)

- **Layout.** Two-thirds column. Back link `Back to your tasks`, caption `Task CR-2026-0142`, H1 = task title.
- **Notification banner** at the top when `flash.statusUpdated` or `flash.created` is set. Use `govukNotificationBanner` with `type: "success"`, `titleText: "Success"`, and the appropriate heading (`Status updated` or `Task created`). Move focus to the banner on render.
- **Summary list.** `govukSummaryList` with six rows: Reference, Status (tag), Due, Description, Created, Last updated. Empty fields render as `Not set`.
- **Update status form.** Self-contained `<form method="post" action="/tasks/:id/status">` with `govukRadios` pre-selected to the current status, hint `Changing status saves immediately.`, and a `Save status` button. Two forms on the page (update + delete entry) must stay separate so a misclick can't trigger destruction.
- **Delete section.** `govuk-section-break--visible`, H2 `Delete this task`, body paragraph, then `Delete this task` button with `govuk-button--warning` styling. The button is a link to `/tasks/:id/delete` (the destructive POST lives on that page).

### 4. Delete confirmation (`/tasks/:id/delete`)

- Back link to the task, caption `Task CR-2026-0142`, H1 `Are you sure you want to delete this task?`, body paragraph explaining permanence.
- `govuk-button-group` with `Yes, delete this task` (`govuk-button--warning`, submits `POST /tasks/:id/delete`) and `No, keep this task` link back to the detail page.

This page exists to satisfy WCAG 2.2 SC 3.3.4 (Error Prevention for legal, financial, data) — a single-step delete from the detail page does not meet the criterion.

## Validation rules and messages

All messages are UK English. Both summary and inline use the same text.

| Rule | Message |
|---|---|
| Title is empty | `Enter a title` |
| Title is over 255 characters | `Title must be 255 characters or fewer` |
| Status missing or unknown value | `Select a status` |
| Due date partly filled | `Enter a complete date and time, or leave all date and time fields blank` |
| Due date not a real date | `Enter a real date and time` |
| Due date in the past | `Due date must be today or in the future` |
| Task not found (list redirect) | `This task could not be found. It may have been deleted.` |

Validate in this order: title, status, due. Build the error summary in the same order.

## Microcopy

Full microcopy table (page titles, button labels, hints, all error messages, banner text) is in `spec.html` section 6. Mirror it verbatim. UK English throughout (`organise`, `behaviour`, `colour`).

## Design tokens

Use GOV.UK Frontend defaults. The only project-specific values are in the service header strip:

- Header background: `#0b0c0c` (GOV.UK black)
- Header underline: `10px solid #1d70b8` (GOV.UK blue)
- Header service name: `#ffffff`, Arial 19px / 1.3 / 700
- Header meta text: `#b1b4b6`, Arial 16px

Do not introduce any other custom colours or non-GOV.UK components or styles.

## Accessibility checklist for build

The full checklist is in `spec.html` section 7. Critical items:

- `<html lang="en-GB">`. Skip link first, single `<h1>` per page, headings descending without skipping levels.
- Focus moves to the H1 on every navigation (give the H1 `tabindex="-1"` and call `.focus()`). On a page rendered with errors, focus moves to the error summary instead.
- Every input has `<label for>`. Group inputs in `<fieldset>` with `<legend>`. Hints linked via `aria-describedby`; error messages added to the `aria-describedby` list, plus `aria-invalid="true"` on the input.
- Inline errors carry a visually-hidden `Error:` prefix.
- Error-summary list order matches field order. Each link's `href` is the id of the first focusable input in that field.
- Touch targets ≥ 24×24 CSS px (GOV.UK Frontend defaults exceed this).
- Page must be usable at 320px width and reflow correctly at 200% zoom in a 1280×1024 viewport.

## State management & flash messages

Use `express-session` (or `connect-flash`) so each redirect can carry a one-shot flag:

```
res.locals.flash = req.session.flash || {};
delete req.session.flash;
```

Flag names this design assumes:

- `flash.created` — set by `POST /tasks` redirect, consumed by detail page.
- `flash.statusUpdated` — set by `POST /tasks/:id/status` redirect, consumed by detail page.
- `flash.deleted` — set by `POST /tasks/:id/delete` redirect, consumed by list page.

## CSRF

Add a hidden token on every POST form. The GOV.UK Frontend macros do not add this for you.

## Out of scope

Do not build any of these. If a story asks for one later, treat it as a new design problem:

- Filtering, sorting, pagination, search.
- Drag-and-drop reordering or status changes.
- Bulk actions (multi-select, batch delete).
- Editing the title, description, or due date after creation. **Status is the only mutable field.**
- Comments, attachments, anything beyond the description text area.
- Multi-user features (assignment, sharing, mentions, audit of who changed what).
- Notifications, email, async comms.
- Real-time updates or websockets.
- Dark mode or theme switching.

## Fixtures

Use `sample_data.json` for your dev seed. All references are fictional (`CR-2026-0142` style). No real names, no real emails, no real photos anywhere — ever.

## Open question for the team

The visual styling of the service header (plain black bar, no GOV.UK crown or wordmark) was a deliberate choice because this is an internal HMCTS tool, not a page on gov.uk. If the service is going to live behind the standard MoJ HMCTS service header pattern (with the HMCTS branded header from `@hmcts/frontend`), swap the header in `layouts/main.njk` for that component and leave everything else unchanged.
