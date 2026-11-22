# Release notes

## 1.0.1

Security fixes after an outside review. "Go back to an earlier version" now installs only an installer from
reqochet's own releases that matches the checksum published with it, and stores it under a random folder name;
SECURITY.md describes exactly what is checked before an installer runs. Building from source installs the libraries
without running their install scripts. Leftover uses of the old name ReqMan are gone where they meant reqochet.

## 1.0.0

The first public version of reqochet: requirements as plain Markdown files in your own Git repository, with a Windows
desktop app to edit, structure, link, compare, merge, import and export them — no server, no accounts. Everything
listed in the README is in it: documents and outline numbers, typed links with suspect-link review, commit / pull /
push at requirement level with a field-by-field merge, Compare like a pull request, baselines and history, coverage
rules and a traceability matrix, Excel / CSV / ReqIF import and export, Word / PDF / web page documents from a company
template, saved views, writing help, five languages (Arabic right-to-left), three themes with a theme editor, and
automatic updates.
