# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # Start Vite development server
```

No test runner, linter, or build step is configured. The project runs directly in the browser via Vite.

## Architecture

Single-page validation UI for curating biomedical specimen metadata (Synapse project context). Three files make up the entire application:

- **`index.html`** — Static HTML structure: project header, tab nav, error summary panel, data table, grid action toolbar
- **`main.js`** — All application logic (~606 lines, ES module loaded via `<script src="main.js">`)
- **`styles.css`** — All styling (~600 lines)

### Core subsystems in `main.js`

**Validation engine** — `validateCellContent(cell, valueToValidate)` checks cells against column-specific rules (numeric-only for columns 0 and 2, enum for column 4 "Tumor Type", non-empty for all). Returns `{isValid, message, value, columnIndex}`.

**Cell editing** — `activateCellEditing(cell)` replaces cell content with an inline `<input>`. Saving (blur/Enter) triggers validation; Escape cancels without validation.

**Error state** — Errors are keyed by DOM ID (`error-row[X]-col[Y]`). `updateErrorDisplay(cell, validationResult)` adds/removes individual errors; `updateErrorListState()` refreshes the panel visibility and count.

**Error navigation** — `navigateToErrorByIndex(index)` scrolls to a cell, applies visual classes, and auto-opens its editor. Prev/Next buttons and keyboard shortcuts Cmd+] / Cmd+[ cycle through errors.

**Visual states** — Three distinct highlight classes apply to cells:
- `.spotlighted` — yellow, temporary navigation highlight
- `.current-error-glow` — red glow, persists while editing an errored cell
- `.cell-focused` / `#focused-error-msg` — inline error message display while input is active

### Data flow

```
Cell click → activateCellEditing()
           → blur/Enter → validateCellContent()
                        → updateErrorDisplay()
                        → updateErrorListState()

Error link click → navigateToErrorByIndex()
                 → scroll + spotlight + auto-edit
```

An initial validation scan runs on `DOMContentLoaded` to flag pre-existing errors in the static table data.
