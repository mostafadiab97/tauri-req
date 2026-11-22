# Feature catalogue — what requirements tools do

Every feature found in the public documentation of about 190 requirements-management tools (see
`rm-tools-market-list.md`), grouped by area: what each feature is, which kinds of tools have it, and what it adds.
Compiled in October 2026 as the feature pool reqochet chose from; vendors change their products often, so treat
individual cells as indicative.

**Who has it** — groups from the market list: **ENT** enterprise suites (DOORS Next, Jama, Polarion, codebeamer,
Visure, Perforce ALM, Dimensions RM, Cradle, Reqtify…), **MID** mid-market tools (ReqView, reqSuite, Modern
Requirements, Spira, Innoslate, Flow, SysGit, Accompa…), **MED** regulated/medical (Matrix Req, Aligned Elements,
Orcanos, Ketryx…), **MBSE** modelling tools (Capella, Cameo, GENESYS, Enterprise Architect…), **JIRA** Jira/Confluence
add-ons (R4J, RTM, Requirement Yogi…), **WM/PM** work and product management tools (Jira, Azure DevOps, Aha!…),
**TEST** test tools with coverage, **AIQ** quality/AI analysers (QVscribe, IBM RQA, ScopeMaster…), **DAC**
docs-as-code and Git tools (Doorstop, StrictDoc, sphinx-needs, TRLC, OpenFastTrace, Reqord…).

| Area | Features |
| --- | --- |
| A. Writing requirements | 16 |
| B. Structure and finding things | 13 |
| C. Traceability | 15 |
| D. Versions and change | 13 |
| E. Working together and review | 12 |
| F. Process and permissions | 8 |
| G. Quality and analysis | 9 |
| H. Verification and test | 7 |
| I. Safety, risk and compliance | 8 |
| J. Files in and out | 12 |
| K. Connections to other tools | 12 |
| L. AI | 10 |
| M. Platform and product | 14 |
| N. Planning and product management | 9 |
| O. Models and diagrams | 5 |
| **Total** | **163** |

## A. Writing requirements

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| A1 | Structured items with custom fields | All | Each requirement has typed fields (text, list, enum, number, date) defined per project. Lets teams record status, priority, owner, safety level… and filter by them. |
| A2 | Item types (requirement, test, risk, heading…) | All | Each item has a type with its own meaning and allowed fields. Separates needs, requirements, tests, risks. |
| A3 | Headings / information items | All document tools | Items that structure a document (chapters, notes) but are not requirements — excluded from coverage. |
| A4 | Rich text: bold, italic, lists, links | ENT, MID, JIRA | Formatted text instead of plain text. Readers expect documents to look like documents. |
| A5 | Tables inside the text | ENT, MID | Tables of values (limits, modes) inside a requirement. Common in hardware and interface specs. |
| A6 | Images and attachments | ENT, MID, MED | Pictures, drawings, PDFs attached to an item. Needed for interface drawings, screenshots, datasheets. |
| A7 | Equations | ENT (Polarion, DOORS), ReqView | Formulas (MathML/LaTeX) in the text. Used in control and signal requirements. |
| A8 | Item templates per type | ENT, MID, ReqView | A new item of a type starts with prepared text ("The system shall…", acceptance criteria section). Consistent writing, faster authoring. |
| A9 | Requirement formats (EARS, user story, "shall" patterns) | MID (reqSuite, Reqord), AIQ, Visure | Guided sentence patterns: EARS ("When <trigger>, the <system> shall <response>"), user stories ("As a… I want… so that…"). Improves clarity and testability. |
| A10 | Glossary / defined terms | ENT (Visure, Polarion), AIQ | A list of defined terms; terms in requirements are highlighted and linked to their definition. Removes ambiguity ("user" vs "operator"). |
| A11 | Spell check | Most | Underlines misspelled words. |
| A12 | Undo / redo of edits | Most (missing in ReqView — reviewers complain) | Take back the last edits. |
| A13 | Duplicate / copy an item (with or without children) | All | Make a new item from an existing one. Saves time for similar requirements. |
| A14 | Bulk edit | All | Choose many items → set status/owner/priority/tags at once. Daily need after reviews. |
| A15 | Find and replace across items | ENT, ReqView | Replace a term in all texts (e.g. a renamed component). |
| A16 | Computed fields | codebeamer, Jama | Fields calculated from others (e.g. risk = severity × probability, coverage %). |

## B. Structure and finding things

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| B1 | Hierarchy / document tree | All | Items in chapters and sub-chapters, like a specification document. |
| B2 | Automatic outline numbers (1.2.3) | All document tools | Numbers follow the position and update after moves. |
| B3 | Several documents / modules per project | ENT (DOORS modules, Polarion LiveDocs), ReqView | One project holds several specifications (customer spec, system spec, test spec), each with its own tree. |
| B4 | One requirement in several documents (reuse by reference) | DOORS Next (base artifacts), Visure | The same item appears in two documents without copying. |
| B5 | Full-text search | All | Find items by words in ID, title, text. |
| B6 | Filters by type, field, links | All | Narrow the table to what matters. |
| B7 | Saved views | All, ReqView | Name a combination of filter, columns, sort ("Open safety requirements") and come back to it; share it with the team. |
| B8 | Query language | ENT (cbQL, DOORS filters, Polarion Lucene) | Typed queries: `type:SYS status:Draft links:none text:"brake"`. Power users find anything in one line. |
| B9 | Sorting by any column | All | Click a header to sort. |
| B10 | Column chooser, order, widths | All | Show the fields that matter, in your order. |
| B11 | Tags / labels | Most | Free labels for grouping across the tree. |
| B12 | Collections / baselines of a subset ("release scope") | DOORS (collections), Jama (sets) | A named set of items regardless of their place (e.g. "Release 2 scope"). |
| B13 | Recently changed / my items / favourites | ENT, WM | Quick lists: what changed this week, what I own, what I starred. |

## C. Traceability

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| C1 | Typed links between items | All | "TC-1 verifies SYS-1", "SYS-1 refines STK-1"; read from both sides. The core of traceability. |
| C2 | Suspect links | ENT, ReqView, Doorstop | When a linked item changes, the link is marked for review. Shows what may be outdated. |
| C3 | Items without links (orphans) | All | Find requirements nobody refines or tests. |
| C4 | Link types editable in the window | All | Add/rename link types and their reverse names without editing files. |
| C5 | **Traceability matrix** | All ENT/MID, StrictDoc, sphinx-needs | A grid: rows = items of one type, columns = items of another, a mark where a link exists. Reviewers and auditors read coverage at a glance. |
| C6 | **Coverage analysis** | All ENT/MID, TEST, DAC | "Which system requirements have no verifying test?", "% of needs refined". The first question in every review and audit. |
| C7 | Traceability rules / information model + score | Jama (TIM, trace score), Polarion | The allowed links are declared (needs → requirements → tests); violations and a "trace score" are shown live. Makes traceability checkable, not a manual review. |
| C8 | **Impact analysis across levels** | ENT, Reqord | "If I change this requirement, what is affected?" — follows links several levels down/up. |
| C9 | Traceability graph | Reqord, sphinx-needs (needflow), Jama, MBSE | A picture of items and their links (needs → requirements → tests). Helps explain and spot gaps. |
| C10 | Links to source code | DAC (StrictDoc, OpenFastTrace, mantra, duvet), Reqtify | Code comments or test names mention requirement IDs (`// REQ-K7Q3XMB`); the tool shows which requirements are implemented where. **Natural for a Git tool** — the code is in the same repository. |
| C11 | Links to test results | DAC, TEST, ENT | Test reports (JUnit XML…) are read; each requirement shows passed/failed/not run. Closes the V-model loop. |
| C12 | Links to external items (URLs, issues) | Most | A link to a Jira issue, a GitHub issue, a document URL. |
| C13 | Cross-project / cross-repository links | ENT, ReqView (linked projects) | A requirement in project A traces to one in project B (system → subsystem specs). |
| C14 | Cross-tool links (OSLC) | DOORS Next, Polarion, codebeamer | Links to items in other tools without copying them, via the OSLC standard. |
| C15 | Link attributes / rationale | DOORS, Jama | A note on a link ("why this test verifies this requirement"). |

## D. Versions and change

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| D1 | History per item | All | Every change with who/when/what. |
| D2 | Compare any two versions | All | What changed between two points, per requirement. |
| D3 | Requirement-level difference view | ENT, ReqView | Field and text differences, not file lines. |
| D4 | Take back part of a change | Few (we are ahead) | Undo one field/text/link of an uncommitted change. |
| D5 | **Baselines (named frozen versions)** | All ENT/MID, ReqView, StrictDoc | "Release 1.0" = the exact state of all requirements at a moment; compare today against it; deliver it. Every audit asks "which baseline?". |
| D6 | Branches / streams | DOORS Next, codebeamer, Polarion | Parallel versions (a variant, a change in progress). |
| D7 | Merge per requirement | DOORS Next, codebeamer | Combining branches item by item with conflict decisions. |
| D8 | Restore an old version of an item | Most | Bring back an item as it was in an older version. |
| D9 | Audit trail | All (MED strictly) | Who changed what when, tamper-evident. |
| D10 | Change requests | ENT, MED | A formal request that groups proposed changes, with impact and approval, before the requirements change. |
| D11 | Signed changes | MED, compliance | Each change cryptographically signed by its author. |
| D12 | Variants / product lines | codebeamer (+pure::variants), DOORS | One requirement set for many product variants with features switched on/off. |
| D13 | Lock an item while editing | ReqView (documents), DOORS Classic | Prevents parallel edits. |

## E. Working together and review

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| E1 | Share work through a central place | All | Everyone sees the same requirements. |
| E2 | Several people editing at the same time | ENT web tools, us | No waiting for locks. |
| E3 | **Comments / discussion threads per item** | ENT, MID, JIRA | Questions and answers attached to a requirement, resolved when done. Keeps the "why" next to the item. |
| E4 | @mentions and notifications | ENT, WM | Tell a colleague; they get notified. |
| E5 | **Approval status / sign-off** | All ENT, Reqord (PR-based) | A requirement is "approved" only after the right people agree; who/when is recorded. |
| E6 | Formal review sessions | Jama Review Center, Polarion, DOORS | A review package (a set of items) sent to reviewers who mark each item accepted/rejected/commented, with a summary. |
| E7 | Cheap reviewer access (no full licence) | Jama, Polarion | Reviewers read and comment without being authors. |
| E8 | Owner / assignee per item | All | Who is responsible. |
| E9 | Tasks / to-dos on items | WM, ENT | Action items attached to requirements. |
| E10 | Real-time co-editing of one item | Web suites | Two people type in the same text at once. |
| E11 | Presence ("Alice is editing SYS-12") | Web suites | See who works on what right now. |
| E12 | Exclusive check-out | DOORS Classic, ReqView | See D13. |

## F. Process and permissions

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| F1 | Status field | All | Draft → Review → Approved → Obsolete. |
| F2 | Workflow engine (allowed transitions, guards) | ENT, MED | Status may only change along defined paths, sometimes with conditions (e.g. "Approved needs a reviewer"). |
| F3 | Who may change what (roles) | ENT, MED | Read/write rights per project, type or field. |
| F4 | Field permissions by role and state | codebeamer | E.g. only QA may set "Verified". |
| F5 | Required fields / validation rules | All | A requirement can't be saved/approved without priority, owner… |
| F6 | Mandatory review before merge | GitHub, ENT | Changes reach main only after approval. |
| F7 | Process templates (ASPICE, ISO 26262, DO-178C) | codebeamer, Visure, StrictDoc | Ready types, links, fields and rules for a standard. |
| F8 | Electronic signatures (21 CFR Part 11) | MED, ENT | Legally binding approvals with re-authentication. |

## G. Quality and analysis

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| G1 | **Wording quality checks** | AIQ (QVscribe, IBM RQA, RQA), Visure, ReqView, Reqord | Flags vague words ("fast", "user-friendly", "etc."), passive voice, missing "shall", several requirements in one sentence, unbounded terms; often against INCOSE rules or EARS. Catches problems before review — cheap and visible. |
| G2 | Quality score (SMART) | Reqord, AIQ | A number per requirement for specific/measurable/achievable/relevant/time-bound. |
| G3 | Duplicate / similar requirement detection | AIQ, AI tools | Finds near-identical requirements. |
| G4 | Completeness checks | ENT | Missing fields, missing links, unresolved TBDs. |
| G5 | Consistency rules | ENT, TRLC | Cross-item checks (a child's priority not higher than its parent's, units consistent). |
| G6 | Dashboards / metrics | ENT, Reqord, WM | Counts by status/type, coverage %, changes over time. |
| G7 | Health score | Reqord, Jama (trace score) | One number for the project's state. |
| G8 | Reports (custom, scheduled) | ENT | Configurable reports (lists, matrices, charts) for management. |
| G9 | Change statistics | ENT, Git tools | Who changed how much, churn per chapter — finds unstable requirements. |

## H. Verification and test

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| H1 | Test cases as items, linked to requirements | All | Tests are items; "verifies" links connect them. |
| H2 | Test steps (structured) | TEST, ENT, Spira | Test cases with numbered steps and expected results. |
| H3 | Test runs and results | TEST, ENT | Record pass/fail per test per run; history of results. |
| H4 | Verification status per requirement | ENT, TEST, DAC | Requirement shows verified/failed/not verified from its tests' results. |
| H5 | Test management integration | ENT, JIRA (Xray…) | Sync with TestRail, Xray, qTest. |
| H6 | Requirements-based test generation | AI tools, Tricentis, Agile Designer | Proposes test cases from requirement text. |
| H7 | Validation (stakeholder acceptance) | ENT | Separate from verification: needs accepted by customers. |

## I. Safety, risk and compliance

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| I1 | Risk items and risk matrix | ENT, MED | Risks with severity/probability, a matrix view, mitigations linked. |
| I2 | FMEA tables | codebeamer, Jama, MED | Failure modes with effects, causes, RPN; linked to requirements. |
| I3 | Hazard analysis (ISO 14971, ISO 26262 HARA) | MED, ENT | Hazards → harms → risk controls → requirements. |
| I4 | Standards templates (ISO 26262, DO-178C, IEC 62304, ASPICE) | codebeamer, Visure, StrictDoc, MED | Ready schemas, rules and document templates for a standard. |
| I5 | Compliance matrix | MED, ENT | Clauses of a standard mapped to the requirements that satisfy them. |
| I6 | Design history file / technical file | MED | The collected documents an auditor needs, generated. |
| I7 | Tool qualification kit | ENT (for DO-178C/ISO 26262) | Evidence that the tool itself is reliable. |
| I8 | Safety levels (ASIL, DAL, SIL) | ENT, MED | A field with allowed values and rules (decomposition). |

## J. Files in and out

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| J1 | Excel import/export (round trip) | All | Exchange with people who work in Excel. |
| J2 | CSV | All | Simple exchange. |
| J3 | ReqIF | ENT, ReqView | Standard exchange with DOORS, Jama, Polarion. |
| J4 | Markdown export | DAC | For AI tools and Git reviews. |
| J5 | **Word export with templates** | All except DAC/Reqord | A real specification document (cover, headings with numbers, tables of attributes, links), from a company template. The deliverable customers and auditors expect. |
| J6 | **PDF export** | All | A fixed document for sign-off and printing. |
| J7 | **HTML publishing** | DAC (StrictDoc, sphinx-needs, Doorstop), Reqord | A static website of the specification (search, links clickable) for people without the app — e.g. on GitHub Pages or an intranet. |
| J8 | Word import | ENT, MID (ReqView, AI import) | Turn an existing Word specification into items (headings → hierarchy, paragraphs → requirements). |
| J9 | PDF import | ReqView (AI), MID | Extract requirements from PDFs. |
| J10 | JSON / API export | DAC, ENT | Machine-readable dump for scripts. |
| J11 | Print view | Most | Print what is on screen. |
| J12 | Diagram/image export of views | ENT | Save the matrix/graph as an image. |

## K. Connections to other tools

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| K1 | GitHub (repositories, pull requests) | DAC, Reqord, SysGit | Hosting, review, approval. |
| K2 | GitLab / Bitbucket / Azure Repos | DAC, SysGit | Same as GitHub on other hosts. |
| K3 | Jira | All ENT/MID, JIRA | Requirements linked to Jira issues; status synced. |
| K4 | Azure DevOps Boards | Modern Requirements, ENT | Same for Azure DevOps. |
| K5 | GitHub Issues | Reqord | Create issues from requirements; show their state. |
| K6 | Modelling tools (Enterprise Architect, Cameo, Capella) | ENT, MBSE, ReqView | Requirements shown in models and back. |
| K7 | Simulink / MATLAB | Polarion, DOORS, Reqtify | Requirements linked to model blocks. |
| K8 | Test tools | TEST, ENT | See H5. |
| K9 | Chat (Teams, Slack) notifications | WM, ENT | Messages when items change. |
| K10 | **Command line / CI check** | DAC, Reqord, ReqView | `reqman check` in a GitHub Action: broken links, missing fields, coverage rules, quality hints — on every pull request. Makes "reviewed like code" real and enforces rules without a server. |
| K11 | REST API / plug-in API | ENT | Other programs read/write requirements. |
| K12 | Webhooks | ENT, WM | Call other systems on changes. |

## L. AI (all enterprise tools added this in 2025–26)

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| L1 | Write / improve a requirement | ENT, reqSuite, Copilot4DevOps, AIQ | Suggests clearer wording, EARS form, splits compound requirements. |
| L2 | Generate requirements from documents | ENT, MID | Drafts items from meeting notes, specs, PDFs. |
| L3 | Test generation | ENT, TEST | H6. |
| L4 | Trace suggestions | ENT, research tools | Proposes missing links by meaning. |
| L5 | Change summaries | ENT, AI tools | "What changed in this pull" in plain words. |
| L6 | Chat with the specification | ENT, AI tools | Ask questions about the requirements. |
| L7 | AI-ready export / context | Reqord | A compact export of an item and everything linked, for AI tools. |
| L8 | MCP server | Jama, Visure, jama-cli, community servers | AI agents (Claude, Copilot) read and edit requirements through a standard protocol. |
| L9 | Quality analysis with AI | AIQ, ENT | G1 with language understanding. |
| L10 | Similarity with AI | AIQ | G3 with meaning instead of words. |

## M. Platform and product

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| M1 | Works offline, no server | DAC, ReqView, us | Everything local; sync when online. |
| M2 | Windows app | Most desktop tools | — |
| M3 | macOS / Linux | ReqView, DAC, MBSE | Teams with Macs and Linux PCs. |
| M4 | Web / browser version | ENT SaaS, MID SaaS | Use without installing; managers and customers. |
| M5 | Multi-user server / SaaS | ENT, MID | Central server with accounts. |
| M6 | Single sign-on, accounts | ENT | Company login. |
| M7 | Themes, dark mode, custom look | Some | Comfort and branding. |
| M8 | **Several languages (UI)** | ENT (DE/FR/JA/ZH), reqSuite (DE) | The window in the user's language. |
| M9 | Accessibility (keyboard, screen readers) | ENT | Usable without a mouse, with screen readers. |
| M10 | Automatic updates | Desktop tools | — |
| M11 | Scale (100k+ items) | ENT | Large programmes. |
| M12 | Licensing / trial | All commercial | Sell the product. |
| M13 | Code signing of the installer | Commercial | No browser/SmartScreen warnings. |
| M14 | In-app self-test / diagnostics | Rare | The user checks the installation. |

## N. Planning and product management (mostly other tools' territory)

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| N1 | Priority | All | — |
| N2 | Estimates (hours, complexity) | Reqord, WM | Effort per requirement. |
| N3 | Releases / roadmap assignment | PM (Aha!, Jama), Spira | Which requirements go into which release. |
| N4 | Gantt / critical path | Reqord, WM | Schedule view. |
| N5 | Kanban boards | WM | Cards by status. |
| N6 | Stakeholder management | ENT, MID (Accompa) | Who asked for what; stakeholder lists. |
| N7 | Elicitation: interviews, surveys, voting, feedback portals | PM, Accompa, Olive | Collect needs from customers. |
| N8 | Use-case / user-story mapping | CaseComplete, PM | Story maps, use-case flows. |
| N9 | Feedback loop from implementation | Reqord | Issues raised during implementation flow back to requirements. |

## O. Models and diagrams

| # | Feature | Who has it | How it works · what it adds |
| --- | --- | --- | --- |
| O1 | Diagrams inside requirements | ENT, MID | Flowcharts, state machines drawn in the text. |
| O2 | SysML requirement diagrams | MBSE | Requirements as model elements. |
| O3 | Model ↔ requirement sync | MBSE, ENT | Requirements live in the model. |
| O4 | Prototypes / mock-ups linked to requirements | iRise | Clickable UI mock-ups. |
| O5 | Context/architecture diagrams generated from links | MBSE, sphinx-needs | Pictures of system structure from items. |
