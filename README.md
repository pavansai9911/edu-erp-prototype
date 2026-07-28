# NextGen EduERP — Mobile Prototypes

Production-grade, mobile-first clickable prototypes. Hosted on GitHub Pages.

## Structure
- `index.html` — portal chooser
- `admin/` — ERP Admin app (complete)
- `founder/` — Founder app (complete)
- `staff/` — Staff app (later)
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
