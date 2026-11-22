# How reqochet was built

reqochet was built by **one curious developer and a team of AI agents** — in about three weeks of calendar time
(25 October to mid-November 2026), with about 70 hours of the owner's own time.

## Where the features came from

Before the first line of code, the team studied the field. The **publicly available documentation of 191
requirements-management tools** was read and compared — from the big commercial suites to small open-source
projects — and every feature found was collected into one **feature pool** (163 features, grouped, with how common
each one is; both are in `docs/research/`). Five of the big tools were studied in depth (`docs/design/analysis.md`). reqochet's features were chosen
from that pool: what teams need every day, what the big tools do well, and what nobody did with plain files in Git.

## Who did what

- **The owner** (a software developer) decided the product: what it does, how it should feel, what comes first. He
  installed every release on his Windows 11 PC, tested it with a short checklist and reported back by step number.
- **Claude** (Anthropic's AI model, working through Claude Code) wrote the code, the tests and the documentation,
  explained every technical choice in plain words, and released each version.
- **Helper agents** — also Claude, each with one job — reviewed every theme version before release: a code reviewer, a
  QA tester who writes new tests to break things, a UI/UX reviewer working from screenshots, a security reviewer, an
  Arabic reviewer, a documentation reviewer, a performance tester; and around them a brand reviewer, a web designer,
  a marketer and an animator. **Fable** designed the brand, the website and the films.

## How it was kept honest

- Every release is built and tested on GitHub's Windows machines: about a thousand unit tests, end-to-end scenarios
  that drive the real app, a speed test with 10,000 items, and a self-test inside the app that anyone can run.
- Product decisions were asked, never assumed; every question and answer is written down.
- The rules are enforced by the build: module boundaries, every colour from the theme file, every word on screen from
  the language files, no personal data in the repository.
- Mistakes that cost time were recorded and read again before touching the same area, so they were not made twice.

## Where to start reading

`docs/ONBOARDING.md` for engineers, `docs/USER-GUIDE.md` for users, `docs/ARCHITECTURE.md` for the design.
