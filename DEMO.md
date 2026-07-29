# NextGen EduERP — Investor Demo Script (~6 minutes)

Open on a phone. Same tab throughout (so the data stays in sync across apps).
Start from the portal (`index.html`).

---

## 1. The buy surface — Founder app (~2 min)

Open **Founder**. This is what a school owner opens every morning.

- **Dashboard**: money is prominent but not the whole story — point out the
  period-filtered fee card (Today / Week / Month / Term / Year), then the
  balanced "School health" row underneath: attendance, pass rate, students,
  fee defaulters. Say: *"A school owner cares about more than collections —
  this is a school-health cockpit, not just an accounting app."*
- Tap the **school name in the header** → the branch switcher. Select the
  second branch. Everything on screen recomputes — same APK works for a
  single-branch Basic school and a multi-branch Pro school.
- Go to **More → Staff**. Tap **+** to add a new staff member live: fill a
  name/email/password/designation, pick a **Role** (watch the permission
  picker pre-fill), tap **Create**. Say: *"This creates a real login — the
  person could sign into the Staff app right now with these permissions."*

## 2. The renewal surface — Staff app, four people, one app (~3 min)

Navigate to **Staff** (same tab — the staff member you just added is already
there). Tap the top banner to open the **staff switcher**.

- **Teacher (Divya)**: Home → Attendance. Show the whole section is
  Present by default; tap a couple of P/A/L/H/E chips for different students.
  Save. Say: *"A teacher does this in under 20 seconds, every single day —
  it's the most-repeated action in the whole product."*
- Switch to **Accountant (Meera)**: Payments → tap a student with dues →
  Record payment. Point out the **wrong-student confirmation** before money
  moves, and the **overpay guard** if you type too much. Confirm → real
  receipt appears.
- Switch to **Receptionist (Vikram)**: Admissions → tap **+** → capture a new
  enquiry in ~20 seconds → land back on the funnel.
- Switch to **Principal (Anjali)**: Home → point out the **Approvals inbox**
  badge count, tap in, approve or reject a leave request or an application
  with one tap.

Land back on **Home** for each person and say: *"Same codebase, same
sessionStorage — the navigation, the dashboard, every screen you can reach is
computed live from that person's permissions, never hard-coded to their job
title. Create a brand-new role tomorrow — say, a librarian who only checks out
books — and it slots in with zero engineering work."*

## 3. The platform layer — ERP Admin (~1 min)

Navigate to **ERP Admin**. Say: *"This is Anthropic's own console — onboarding
new schools, managing subscription tiers, watching platform-wide growth."* Run
through the 4-step onboarding wizard for a new school if time allows.

---

## Talking points if asked

- **"Is this real data?"** — No live backend; this is a frontend prototype
  with a realistic, deterministic dataset (64 students, a full fee ledger with
  concessions, a staff directory, an admissions funnel). The backend (FastAPI +
  PostgreSQL, RLS multi-tenancy, JWT auth, full RBAC) is built and frozen
  separately — this prototype mirrors its exact permission model.
- **"How do you know the Staff app scales past 4 roles?"** — It was tested
  live: a brand-new custom role with a single permission automatically got the
  correct dashboard, tabs, and available actions with no code change.
- **"What stops a receptionist from admitting a student themselves?"** — Nothing
  in the UI *lets* them try — the "admit" decision only exists inside the
  Principal's Approvals inbox, gated by a specific permission the receptionist
  role doesn't hold.

## If something looks off mid-demo

Every app has a **reset**: top banner on ERP Admin & Founder; **More → Settings
→ Reset demo data** on the Staff app. One tap regenerates clean demo data.
