# Curator Error Display

A prototype UI for validating and curating biomedical specimen metadata, built in the context of Synapse data management.

**[Live demo](https://adamhindman.github.io/curator-error-display/)**

## What it does

Displays a table of biomedical specimen records and validates cell values in real time. Errors are surfaced in a panel above the table with navigation controls so curators can step through and fix each one.

**Validation rules:**
- Patient ID and Parent ID must be numeric
- Tumor Type must be one of the accepted enum values (`Malignant`, `Benign`, `Adenocarcinoma`, `Squamous Cell Carcinoma`, `Large Cell Carcinoma`)
- All cells must be non-empty

**Interactions:**
- Click any cell to edit it inline; validation runs on save (blur or Enter), cancel with Escape
- Prev/Next buttons cycle through errors; keyboard shortcuts `Cmd+[` / `Cmd+]` (Mac) or `Ctrl+[` / `Ctrl+]` (Windows) do the same
- Clicking an error in the list scrolls to and auto-opens that cell for editing
- "Add an Error" button injects a new invalid row for testing

## Stack

Vanilla JS (ES modules), HTML, CSS — no frameworks. Bundled with [Vite](https://vitejs.dev/).

## Development

```bash
npm install
npm run dev
```
