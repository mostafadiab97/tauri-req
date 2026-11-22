# reqochet

**Requirements as plain files in your own Git — with a desktop app that understands them.**

reqochet is a local, Git-based requirements management tool for Windows. Every requirement is one Markdown file in a
`requirements/` folder of your project's own Git repository, next to the code. reqochet is the app to view, edit,
structure, link, compare, merge, import and export them. No server, no accounts: who may read or change the
requirements is whatever your Git host (GitHub, GitLab, Azure DevOps, Bitbucket, your own server) allows.

Licence: PolyForm Shield 1.0.0 (`LICENSE.md`) — free to use for everyone, companies included.

## What it does

- **Requirements:** a tree table with calculated outline numbers, documents (one folder each), an editor with
  Markdown text, item types and custom fields set up in the window, typed links with suspect-link review (Keep / Unlink).
- **Git at requirement level:** commit, pull and push of the requirements folder only (never forced), branches, a pull
  that combines changes field by field and asks only about real clashes, a Changes view per requirement, per-item
  history, baselines, and any old version shown read-only in the table.
- **Compare like a pull request:** any two versions or branches, per requirement and per link, without a server.
- **Traceability:** coverage rules with gaps marked in the table, the impact chain of an item, and a traceability
  matrix with Excel export.
- **Exchange:** Excel / CSV / ReqIF import (a wizard) and export, writing changes back into the original Excel file;
  Word (from your company template), PDF and web page documents.
- **Daily work:** saved views (personal and team), starting texts per type, writing help, duplicate, change many items
  at once, restore one item's older version, keyboard access in every window.
- **Around it:** Light / Dark / Ember themes and a theme editor; **English, German, French, Spanish and Arabic**
  (right-to-left); automatic updates; problem reports without your user name; a data self-test for a whole project.

**Good to know:**

- **Excel round trip:** export, edit in Excel, import the same file again — only the changes come in.
- **Coming from DOORS, Jama or Polarion:** bring the requirements over as a ReqIF file, with hierarchy, fields and links.
- **Word specifications:** an AI prompt (`docs/guides/word-template-prompt.md`) turns folders of Word documents (many
  versions each) into a reqochet project with its version history, an import report and a company Word template.

## Install (Windows 11)

1. Install [Git for Windows](https://git-scm.com/downloads/win) if you don't have it.
2. Open this repository's **Releases** page → the latest release → **Assets** → download `reqochet-Setup-<version>.exe`.
3. Run it. It installs for your user only — no admin rights needed. Installed copies update themselves from new releases.
4. Read the **[user guide](docs/USER-GUIDE.md)** — it starts with a 15-minute quick start. To explore first, open the
   example project in `examples/` (about 1,200 fictional requirements).

## Build from source

Requires Node.js 22 and Git (Windows set-up, also without admin rights: `docs/DEVELOPING.md`).

```
npm ci --ignore-scripts                 # no library runs code while installing (as on GitHub)
node node_modules/electron/install.js   # Electron's own download of its program (for npm run dev and the tests)
npm run dev        # run the app with live reload
npm run check      # type-check + lint (incl. module-boundary rules) + unit tests
npm run test:perf  # performance tests with 10,000 items
npm run build && npm run test:e2e   # drive the built app through the end-to-end scenarios
npm run dist:win   # build the Windows installer (on Windows)
```

## Documentation

- **`docs/USER-GUIDE.md`** — quick start, every feature, team set-up, file format
- `docs/README.md` — map of all documentation
- `docs/ONBOARDING.md` — for engineers: how the app is built, with diagrams, and a first change end to end
- `docs/ARCHITECTURE.md` — modules, rules, data format · `docs/THEMING.md` — colours, fonts, the theme editor
- `docs/guides/` — Git hosts, glossaries of the translated windows, the Word-to-reqochet AI prompt
- `RELEASE-NOTES.md` — what each version brings · `HOW-IT-WAS-BUILT.md` — the story behind it
- `SECURITY.md` — reporting a security problem · `CONTRIBUTING.md` — how to contribute
