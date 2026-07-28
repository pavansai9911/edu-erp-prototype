# NextGen EduERP — Mobile Prototypes

Production-grade, mobile-first clickable prototypes. Hosted on GitHub Pages.

## Structure
- `index.html` — portal chooser
- `admin/` — ERP Admin app (complete)
- `founder/` — Founder app (complete)
- `staff/` — Staff app (complete: 4 roles, permission-computed navigation)
- `shared/` — design tokens, styles, data engine, auth, utils (the foundation all apps share)

## Data
- **sessionStorage** — survives refresh & new tabs in the same session; clears when all tabs close.
- Starts empty: only the platform admin exists. Onboard schools to populate.
- Reset anytime via the banner at the top.

## Login (ERP Admin)
- Email: `admin@nextgeneduerp.com`
- Password: `demo1234`

## Login (Founder app)
The Founder app auto-logs-in as the demo founder (Rajesh Kumar, Sunrise Public School)
for prototype convenience. In production, founders log in with the credentials created
during onboarding in the ERP Admin app.

## Staff app (the four-role app)
The Staff app is ONE app that four roles share — Principal, Teacher, Accountant,
Receptionist. Navigation and screens are **computed from each user's permission
codes**, never from a role name. A user only ever sees tabs and actions they're
permitted to use (absent, not disabled).

For review, tap the top banner ("tap to switch role") to switch between the four
roles and see how the whole app recomputes:
- **Teacher** → Attendance (default-present, tap to mark exceptions), Students
- **Accountant** → Payments (itemized dues, overpay + wrong-student guardrails, receipt), Reports
- **Receptionist** → Admissions (funnel, ~20s lead capture, duplicate-phone warning)
- **Principal** → Approvals inbox (leave + applications, one-tap decisions), Reports (in More)

The role switcher is a review affordance only — not a real product feature. In
production, each staff member logs in and receives their own permission set.
