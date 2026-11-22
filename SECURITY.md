# Security

reqochet is a desktop app without a server: it reads and writes files in your own Git repository and runs your own
`git` program. Still, a mistake in it could harm your data or your PC — please tell us privately.

## Reporting a problem

Use GitHub's **private vulnerability reporting**: on this repository's page open **Security → Report a
vulnerability**. Only the maintainers see the report. Please do not open a public issue for a security problem.

Helpful to include: the version (Settings → Environment), what you did, what happened, and a small project or file that
shows it (made-up content only — never real requirements).

## What we do

We confirm the report, fix it in a new version (installed copies update themselves) and say in the release notes what
was fixed once the update is out. There is no bug bounty.

## Supported versions

Only the newest version gets fixes; the app updates itself.

## Known limits

- **The installer and its updates are not code-signed** (signing needs a paid certificate). Windows SmartScreen may
  warn on the first install.
- **What is checked before an installer runs:** every update — the automatic one and "go back to an earlier version"
  — is downloaded only from this repository's releases and checked against the SHA-512 published with that release
  (`latest.yml`); a download that does not match is not run. That checksum comes from the same release, so it protects
  against damaged or swapped downloads, not against someone who controls the release repository: that is why every
  release needs the maintainer's approval before it is built, `main` cannot be force-pushed or deleted, and the
  maintainer's GitHub account must use two-factor sign-in.
- **Inline styles are allowed in the window** (`style-src 'unsafe-inline'` in the content security policy): the
  table's virtual scrolling positions its rows with inline styles. Scripts may come only from the app itself.
