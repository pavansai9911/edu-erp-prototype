# NextGen EduERP — Mobile Prototypes

Production-grade, mobile-first clickable prototypes for a multi-tenant K-12 school
ERP SaaS (India). Three apps, one shared design system and data engine. Hosted on
GitHub Pages — open on a phone for the real experience.

## Structure
- `index.html` — portal chooser (all 3 apps)
- `admin/` — ERP Admin app (platform operator console — Anthropic-side, org onboarding)
- `founder/` — Founder app (the school owner's app — the ★buy surface)
- `staff/` — Staff app (the whole-school app — every non-founder employee, one app, permission-computed)
- `shared/` — design tokens, styles, data engine, auth, utils, and the RBAC model — the foundation all three apps share

## How to demo — see `DEMO.md`
A suggested investor walkthrough script (~6 minutes) lives in `DEMO.md`. It covers
all three apps in a deliberate order that tells the product's story.

## Data & reset
- **sessionStorage**, scoped per browser tab. It survives page refresh and any
  same-tab navigation (e.g. clicking between apps from the portal). It does
  **not** carry over into a brand-new tab or window — each new tab starts fresh.
- Every app seeds itself with realistic demo data on first load — nothing starts
  empty except the ERP Admin's org list (only the platform admin exists there;
  onboard a school to populate it).
- **Founder and Staff apps share one live dataset** (students, fees, staff
  directory, roles) via the same sessionStorage-backed engine — add a staff
  member in either app and it appears identically in the other, in the same tab.
- Every app has a **"Reset demo data"** action if a live demo gets messy:
  - ERP Admin & Founder: tap the top banner.
  - Staff app: the top banner is the role/user switcher (see below) — reset
    instead lives in **More → Settings → Reset demo data**.

## Login (ERP Admin)
- Email: `admin@nextgeneduerp.com`
- Password: `demo1234`

## Login (Founder app)
Auto-logs in as the demo founder (Rajesh Kumar, Sunrise Public School) for
prototype convenience. In production, founders log in with credentials created
during onboarding in the ERP Admin app.

## Login (Staff app)
No login screen — opens directly as a default staff member (Divya Krishnan,
Class Teacher) for prototype convenience. In production, each employee logs in
individually and receives their own permission set from the backend.

## Staff app — the architecture worth understanding
The Staff app is used by **every non-founder employee**, not just teachers —
Principal, teachers, accountant, receptionist, and any custom role a school
creates (librarian, lab assistant, counselor, ...). It is genuinely **one
codebase** rendering different products per person:

- Navigation, dashboard widgets, and every gated action are computed from a
  user's **live permission codes** (`MODULE.RESOURCE.ACTION`, mirroring the
  frozen backend's RBAC exactly) — never from a role name or `if/else` on job
  title. A brand-new custom role slots in with **zero code changes** (proven in
  testing: a "Cashier Only" role with just one permission automatically got the
  correct dashboard and navigation).
- Roles are **editable permission bundles**, not hard-coded profiles. Adding or
  editing staff uses a **role-first, then refine** picker: choose a template
  role to pre-fill sensible permissions, then open any of the 10 module
  accordions to add or remove individual permissions for that one person.
- **Real school guardrails**, not just happy paths: re-marking already-taken
  attendance shows an "editing" banner instead of silently overwriting; payments
  require confirming the exact student, amount, and mode before money moves,
  plus an overpay block; duplicate leads (same phone twice) are flagged; and the
  Applied → Admitted admissions decision is **only** reachable through the
  Principal's actual approval — never a free "advance" button, closing an RBAC
  bypass a naive implementation would allow.

For review, tap the top banner ("tap to switch role") to switch between staff
members and watch the whole app — tabs, dashboard, and available actions —
recompute live from that person's permissions:
- **Teacher** → Attendance (P/A/L/H/E per student, default-present), Students, own-section activity feed
- **Accountant** → Payments (itemized dues, guardrails, receipt), Reports, recent-payments feed
- **Receptionist** → Admissions (funnel, ~20s lead capture, duplicate-phone warning), funnel snapshot
- **Principal** → Approvals inbox (leave + applications, one-tap decisions), Staff & HR (directory, add/edit staff, roles, staff attendance, academic structure), school-wide activity feed

The switcher is a review affordance only — not a real product feature.

## Founder app — Staff & HR parity
The Founder app includes the same **Add/Edit Staff** screen as the Staff app
(Principal), reading and writing the same shared staff directory and roles —
because the backend allows anyone holding `STAFF.PROFILE.CREATE` to manage
staff, and a Founder should never be blocked from doing what their own
Principal can do.
