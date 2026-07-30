# NextGen EduERP — Investor Demo Script (~8 minutes)

Open on a phone. Same tab throughout (sessionStorage keeps all three apps in sync).
Start from the portal (`index.html`).

---

## 1. The buy surface — Founder app (~2.5 min)

Open **Founder**. This is what a school owner opens every morning.

- **Dashboard**: money is prominent but not the whole story — the period-filtered
  fee card (Today / Week / Month / Term / Year), then the "School health" row:
  attendance, pass rate, students, fee defaulters. *"A school-health cockpit, not
  just an accounting app."*
- Tap the **school name** → branch switcher. Everything recomputes — same PWA
  for a single-branch Basic school or a multi-branch Pro school.
- **More → School setup** → show the new Organisation Structure section:
  - **Departments** — CRUD, parent-child hierarchy, head assignment from real
    staff data, duplicate-code guard.
  - **Branches** — CRUD with address fields, no Delete (API-correct — deactivate
    only). *"Branches are never deleted; all historical data is preserved."*
- **More → Settings** → the upgraded hub:
  - **School profile** — all `OrganizationUpdate` fields: display name, legal
    name, institution type, email, phone, timezone.
  - **Organization settings** — attendance threshold, grading scale (percentage /
    GPA / custom segmented control), late-fee grace, school timings, locale.
  - **Notifications** — two tabs:
    - *Preferences*: a per-event × per-channel toggle grid (Fee reminder,
      Attendance alert, Leave decision, Exam schedule, Payment receipt) × (Email,
      SMS, WhatsApp, Push). Each toggle is a single `PUT /notifications/preferences`.
    - *Templates*: grouped by event, each channel toggleable on/off. Body
      templates use `{{variable}}` placeholders.
- **Reports** — open the Reports list. Only reports with real backing data appear.
  - **Attendance by section** — real data from the Staff app (cross-app read).
    Zero fake data — no `charCodeAt` formulas anywhere. If nothing is marked,
    an honest empty state appears.
  - **Staff hierarchy** — `hierarchy_level` drives tree indentation. *"This is
    the same tree the backend will render from GET /staff/hierarchy."*
  - **Admissions funnel** — reads real leads from the Staff app pipeline.

## 2. The renewal surface — Staff app, four people, one app (~4 min)

Navigate to **Staff** (same tab — shared data).

- **Teacher (Divya)**: Home → Attendance. Mark P / A / **Lt** / H / E (the Lt
  code is corrected from the old L/Leave — matches the API enum `late`). Save.
  *"A teacher does this in under 20 seconds every day."*
  - **My leave** → leave balance progress bars per type (Casual 12d, Sick 10d,
    Earned 15d, Maternity 180d), application list with status chips. Tap + to
    apply for leave with `LeaveApplicationCreate` fields.
- Switch to **Accountant (Meera)**: Payments → record a payment with the
  overpay guard. Receipt appears.
- Switch to **Receptionist (Vikram)**: Admissions → **+** → capture an enquiry
  with `LeadCreate` fields (enquirer_name, phone, email, source_channel using
  API enum values: walk_in / phone / referral / website / social_media).
  - Open a lead at "Visited" stage → **Convert to application** (fills
    `ConvertLeadRequest` form: applicant name, DOB, guardian).
- Switch to **Principal (Anjali)**: Show the full power:
  - **Approvals** inbox → approve a leave (writes a `DispatchLogOut` notification
    to the applicant's inbox), decide an application using the 4 transition
    buttons (Admit / Waitlist / Reject / Cancel — all map to
    `TransitionRequest.to_status`).
  - **Application Detail** → shows all `ApplicationOut` fields, transition
    history, decision notes.
  - **Notifications bell** → shows personal inbox with unread badge. Tap a
    notification to mark it read.
  - **More → User accounts** → shows `UserOut` fields (last_login_at,
    is_platform_admin), admin actions: reset password (POST, no body),
    deactivate (PATCH {is_active: false}), change role assignment
    (`RoleAssignmentCreate` with valid_from/valid_until).
  - **More → Roles & permissions** → create a custom role (RoleCreate with
    role_code immutability), edit permissions via grouped catalogue sheet
    (`PUT /roles/{id}/permissions`), delete custom roles (system roles blocked).
  - **More → Academic structure** → 5 tabs: Sessions (AcademicSessionCreate),
    Programs (ProgramCreate with 10-value program_level enum), Class levels
    (ClassLevelCreate with program_public_id), Sections (SectionCreate with
    class_level_public_id + academic_session_public_id), Subjects
    (SubjectCreate + `PUT /class-levels/{id}/subjects` mapping).
  - **More → Audit log** → AuditLogOut records with type + actor filters.
  - **More → Dispatch log** → all DispatchLogOut records with recipient +
    status filters. Shows failed dispatches with failure_reason.

## 3. The platform layer — ERP Admin (~1 min)

Navigate to **ERP Admin**. *"This is the platform operator console — onboarding
new schools, managing subscriptions, monitoring platform growth."* Run the
4-step onboarding wizard if time allows.

---

## Talking points if asked

- **"Is this real data?"** — No live backend; this is a frontend prototype with
  a deterministic dataset (64 students, a full fee ledger, 6 staff, 12 leads,
  4 roles, 12 audit events, 10 dispatch logs). The backend (FastAPI + PostgreSQL,
  RLS multi-tenancy, JWT auth, 203 tests) is frozen separately — this prototype
  mirrors its exact OpenAPI schemas, field by field.
- **"How accurate is the API alignment?"** — Every form field, every seed record,
  and every CRUD method was built by reading the frozen `openapi_july_11_a2.json`
  before writing a single line of code. Field names, enums, required/optional
  marks, endpoint HTTP methods, and request body schemas are all exact matches.
  Claude Code can connect these prototypes to the real backend with minimal
  adaptation.
- **"What stops a receptionist from admitting a student?"** — Nothing lets them
  try — the "admit" decision only exists inside the Principal's Approvals inbox,
  gated by `ADMISSION.APPLICATION.APPROVE`. The application transition uses the
  real 10-status `TransitionRequest.to_status` enum.
- **"How do notifications work?"** — Leave approval/rejection automatically
  creates a `DispatchLogOut` record in the applicant's inbox (internal channel).
  The Founder app manages notification templates and channel preferences. The
  Staff app is the receiving side.

## If something looks off mid-demo

Every app has a **reset**: top banner on ERP Admin & Founder; **More → Settings
→ Reset demo data** on the Staff app. One tap regenerates clean demo data.
