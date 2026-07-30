# NextGen EduERP — Mobile Prototypes

Production-grade, mobile-first clickable prototypes for a multi-tenant K-12 school
ERP SaaS (India). Three apps, one shared design system and data engine. Built as an
executable PRD — every field, enum, and CRUD method aligned to the frozen OpenAPI
(`openapi_july_11_a2.json`, FastAPI backend with 203 tests, RLS multi-tenancy, RBAC).

## Structure
```
eduerp-prototypes/
├── index.html               Portal chooser (all 3 apps)
├── admin/index.html          ERP Admin (platform operator console)
├── founder/index.html        Founder app (school owner — the ★buy surface)
├── staff/index.html          Staff app (every employee, one codebase)
└── shared/
    ├── auth.js, auth-screens.js   Login/ForgotPW/OTP/Reset
    ├── utils.js                   Formatters, helpers
    ├── styles.css, tokens.css     Design system
    ├── data.js                    ERP Admin DB
    ├── founder-data.js            Founder DB
    └── staff-data.js              Staff DB + RBAC engine
```

## How to demo — see `DEMO.md`
An investor walkthrough script (~8 minutes) covering all three apps in sequence.

## Sprint log — what was built

### Phase 1 — ERP Admin (Sprints 1.1–1.4) ✅
| Sprint | What | Key schemas |
|--------|------|-------------|
| 1.1 | Auth screens (Login/ForgotPW/OTP/Reset), rate limiting | — |
| 1.2 | Dashboard + Organizations list + detail | OrganizationsSummaryOut, PlatformOrganizationDetailOut, PlatformBranchOut |
| 1.3 | Plan change + deactivate with reason | Plan enum (BASIC/PRO/ENTERPRISE), deactivationReason |
| 1.4 | Onboard wizard (4-step) | OnboardOrganizationRequest |

### Phase 2 — Founder App (Sprints 2.1–2.6) ✅
| Sprint | What | Key schemas |
|--------|------|-------------|
| 2.1 | Students (5 tabs: Profile, Guardians, Attendance, History, Fees) | StudentOut, GuardianCreate, AttendanceSummaryOut, EnrollmentHistoryOut |
| 2.2 | Fee structure setup | FeeHeadCreate (head_name + is_refundable only), FeeStructureCreate, FeeStructureHeadLineOut |
| 2.3 | Invoice generation + payments + receipts | GenerateInvoicesRequest, InstallmentPlanEntry, PaymentCreate (6-value payment_mode enum), ReceiptOut |
| 2.4 | Departments + branches | DepartmentCreate/Update/Out, BranchCreate/Out (no DELETE — deactivate only) |
| 2.5 | Org settings + notifications | OrganizationUpdate (6 fields), OrganizationSettingsReplace (opaque settings object), NotificationTemplateOut, NotificationPreferenceIn (per event × per channel toggle) |
| 2.6 | Reports rebuild (7 real reports, zero fake data) | CollectionSummaryEntry, FunnelSummaryEntry, StaffHierarchyOut (hierarchy_level), AttendanceSummaryOut (real cross-app data) |

### Phase 3 — Staff App (Sprints 3.1–3.8) ✅
| Sprint | What | Key schemas |
|--------|------|-------------|
| 3.1 | Attendance enum fix + StaffCreate alignment | ATT_STATES L→Lt (matches API enum late), attCodeToApiStatus() mapping, StaffCreate (employee_code, date_of_joining, employment_type enum), StaffOut fields in detail |
| 3.2 | Leave management | LeaveTypeOut (5 types with quotas), LeaveApplicationCreate/Out, POST .../approve and POST .../reject (no body), LeaveHistory with balance bars |
| 3.3 | Admissions depth | LeadCreate (enquirer_name/phone/email, source_channel API enum), ConvertLeadRequest → ApplicationOut, TransitionRequest.to_status (10 statuses), ApplicationDetail with 4 transition actions |
| 3.4 | Academic structure (5 entity CRUD) | AcademicSessionCreate/Out, ProgramCreate (10-value program_level enum), ClassLevelCreate (program_public_id required), SectionCreate (class_level + session junction), SubjectCreate, ClassSubjectMappingReplace (PUT full replace) |
| 3.5 | Roles & permissions depth | PermissionOut (code, action, description) in ModulePermissionGroup[], RoleCreate/RoleUpdate (role_code immutable), RolePermissionsUpdate (PUT full replace), deleteRole (system-role guard), RoleDetailOut (hierarchy_level, is_system_role) |
| 3.6 | User management + audit | UserOut (last_login_at, is_platform_admin), POST reset-password (no body), PATCH /users/me/password, RoleAssignmentCreate (valid_from/until), AuditLogOut (12 seeded events, type + actor filters), _auditLog() auto-writes on key actions |
| 3.7 | Notification screens | DispatchLogOut (10 seeded, 4 channels), personal inbox (internal channel, unread badge on bell), dispatch log admin view (recipient + status filters), leave approval auto-writes dispatch log |
| 3.8 | Final polish + verification | 82-check full-surface audit, DEMO.md + README.md updated, final ZIP |

## API alignment decisions

- **`OrganizationSettingsOut.settings` is an opaque object** — no specific fields in the spec. Prototype defines practical school settings (threshold, grading, timings). Claude Code reads/writes whatever the real backend stores.
- **`TransitionRequest.to_status`** drives the application pipeline with 10 statuses. Lead stage syncs automatically when an application transitions.
- **Attendance marks**: internal `P/A/Lt/H/E` codes in the prototype store; API enum `present/absent/late/half_day/excused` via `attCodeToApiStatus()` mapping.
- **No DELETE /branches** — the API has no such endpoint. Branches are deactivated only.
- **`NotificationPreferenceIn`** sends one record per PUT (not an array).
- **Subject mapping is a full replace** — `PUT /class-levels/{id}/subjects` with `ClassSubjectMappingReplace`.
- **`RoleUpdate` has no `role_code`** — codes are immutable after creation.
- **Approve/reject leave** are separate POST endpoints with no body.
- **`hierarchy_level`** drives tree indentation in staff hierarchy and role display.

## Cross-app data

Founder and Staff apps share one live dataset via sessionStorage. Real cross-app flows:
- Staff marks attendance → Founder reports read real `AttendanceSummaryOut` data
- Staff leads → Founder admissions funnel reads real `FunnelSummaryEntry` data
- Staff hierarchy → Founder reports read real `StaffHierarchyOut` data
- FounderDB department names → Staff "Add Staff" department dropdown
- Leave approval → writes `DispatchLogOut` to the applicant's notification inbox

## Data & reset
- **sessionStorage**, scoped per browser tab. Survives refresh and same-tab
  navigation. Each new tab starts fresh.
- Every app seeds realistic demo data on first load.
- **Reset**: ERP Admin & Founder top banner; Staff: More → Settings → Reset demo data.

## Login credentials

| App | Email | Password |
|-----|-------|----------|
| ERP Admin | admin@nextgeneduerp.com | demo1234 |
| Founder | rajesh@sunrise.edu | Founder@123 |
| Staff | principal@sunrise.edu | Welcome@123 |
| Staff (teacher) | divya@sunrise.edu | Welcome@123 |

## Staff app — the architecture worth understanding

One codebase, every non-founder employee. Navigation, dashboards, and all gated
actions are computed from live `permission_codes` (`MODULE.RESOURCE.ACTION`) — never
from role names or job titles. 32 permissions across 10 modules, 4 system roles
(Principal, Teacher, Accountant, Receptionist), custom roles with full CRUD.

For review, tap the top banner to switch staff members and watch the whole app
recompute. A brand-new custom role slots in with zero code changes.
