# Peepal Codebase Audit

Date: 2026-03-17
Scope: Full read-only architecture and implementation audit (no code changes)
Primary intent source: peepal.md
Additional docs reviewed: peepal/README.md and project brain notes

## 1. System Understanding

Peepal is a server-first multi-tenant SaaS for dietitians built on Next.js App Router + Supabase.

Current architecture pattern in code:
- Server actions are the primary data mutation layer for app modules.
- Supabase RLS is enabled across core tables with tenant boundary based on dietitian_id = auth.uid().
- UI is mostly route-driven with server components for page shells and client components for form interactions.
- Lab report intake has a dietitian upload flow and a tokenized patient upload flow.

High-level conclusion:
- The base multi-tenant foundation exists (RLS and dietitian_id convention are broadly present).
- There are critical defects in the lab upload pipeline and security posture around file URL handling.
- There are important integrity gaps where cross-tenant patient references can be inserted by application logic.
- Some required modules from peepal.md are partial or placeholder.

## 2. Module-wise Findings

### Patients

What is implemented:
- CRUD actions and list/profile pages.
- Search by name, patient code, and phone.
- Profile tabs include summary, health info, appointments, notes, labs, timeline.

Findings:
- Patient phone validation is weak (min length only), allowing clearly invalid numbers.
  - Evidence: src/lib/validations/patient.ts
- createPatient() retries patient_code collision only 3 times and relies on random generation; failure path is raw DB error.
  - Evidence: src/actions/patients.ts
- Patient update payload accepts broad optional values; no normalization of empty strings beyond date_of_birth.
  - Evidence: src/actions/patients.ts, src/components/patients/patient-form.tsx

### Appointments

What is implemented:
- Appointment create/list/status update.
- Slot generation from dietitian availability.
- Double-booking constrained by DB partial unique index.

Findings:
- App-level ownership validation for patient_id on create is missing. Cross-tenant patient IDs can be referenced if known.
  - Evidence: src/actions/appointments.ts
- Race exists in app-level pre-check for slot conflict (query then insert). DB unique index mitigates data corruption, but UX can still see post-submit failures.
  - Evidence: src/actions/appointments.ts and supabase/migrations/00001_initial_schema.sql
- last_visit_at update on completion is a separate write without transactional coordination.
  - Evidence: src/actions/appointments.ts

### Clinical Notes

What is implemented:
- List/create/update/delete with JSON block content.
- Rich client composer with templates, AI enhancement, PDF/WhatsApp options.

Findings:
- createClinicalNote() does not verify patient ownership before insert. This allows cross-tenant patient references in clinical_notes rows.
  - Evidence: src/actions/clinical-notes.ts
- Version increment is fetch-then-update, vulnerable to concurrent edit races (lost increments/content conflicts).
  - Evidence: src/actions/clinical-notes.ts
- Content schema accepts arbitrary block content strings without safety constraints at validation layer.
  - Evidence: src/lib/validations/clinical-note.ts

### Lab Reports

What is implemented:
- Dietitian upload flow, list/detail pages, AI analysis endpoint, secure token generation, public patient upload route.

Findings:
- CRITICAL: Patient upload token flow is broken for unauthenticated users.
  - Root cause: token validation routes use the regular server client under RLS (auth.uid() is null for public user), so token lookup on lab_reports fails.
  - Evidence: src/app/api/upload/secure-token/route.ts, src/app/api/upload/lab-file/route.ts, supabase/migrations/00001_initial_schema.sql
- CRITICAL: Private storage bucket files are exposed using getPublicUrl().
  - Both dietitian upload and patient upload return/store public URLs for lab-reports bucket configured as private.
  - Evidence: src/components/lab-reports/upload-report-form.tsx, src/app/api/upload/lab-file/route.ts, supabase/migrations/00001_initial_schema.sql
- App-level ownership validation for patient_id is missing when generating upload tokens and when creating reports.
  - Cross-tenant references can be inserted into lab_reports.
  - Evidence: src/actions/lab-reports.ts
- AI analysis endpoint authenticates user but does not validate report ownership against reportId before processing provided URLs.
  - Evidence: src/app/api/ai/analyze-lab-report/route.ts
- AI analysis persistence shape mismatch:
  - saveAiAnalysis stores ai_observations as an array containing one object, while detail page expects an object with metrics and observations keys.
  - Result: analysis can disappear after reload.
  - Evidence: src/actions/lab-reports.ts, src/components/lab-reports/lab-report-detail.tsx
- Public token endpoints have no rate limiting or anti-automation controls.
  - Evidence: src/app/api/upload/secure-token/route.ts

### Auth and Onboarding

What is implemented:
- Email/password login/register, email verification flow, reset/update password, onboarding step forms.
- Middleware/proxy route gating for protected and auth-only routes.

Findings:
- Auth callback uses next query directly in redirect construction; no strict allowlist/normalization.
  - Evidence: src/app/api/auth/callback/route.ts
- Onboarding progression can be advanced by direct action invocation; there is no strict prerequisite enforcement server-side.
  - Evidence: src/actions/onboarding.ts
- Password update flow has no explicit post-change session hardening logic at app layer.
  - Evidence: src/actions/auth.ts

### Dashboard

What is implemented:
- Today appointments and recent patients with quick actions.

Findings:
- No critical defects found in dashboard data reads.
- Derived visual status logic differs from persisted status and can show in_progress/completed heuristics without DB state change, which may confuse operational state.
  - Evidence: src/actions/appointments.ts, src/app/(app)/dashboard/page.tsx

## 3. Bug List Grouped by Severity

### A. Critical

1. Public patient lab upload link flow is effectively non-functional due to RLS-bound token lookup with unauthenticated caller.
   - Files: src/app/api/upload/secure-token/route.ts, src/app/api/upload/lab-file/route.ts
2. Private lab report files are exposed via public URL generation (privacy and compliance risk).
   - Files: src/components/lab-reports/upload-report-form.tsx, src/app/api/upload/lab-file/route.ts
3. Cross-tenant data integrity hole: actions can insert records referencing patient_id from another tenant (appointments, clinical notes, lab reports) because app-level ownership checks are missing and schema does not enforce composite tenant FK.
   - Files: src/actions/appointments.ts, src/actions/clinical-notes.ts, src/actions/lab-reports.ts, supabase/migrations/00001_initial_schema.sql

### B. High

1. AI lab analysis endpoint does not verify report ownership before processing request payload.
   - File: src/app/api/ai/analyze-lab-report/route.ts
2. AI analysis save/read contract mismatch causes persisted AI insights to be unreadable after reload.
   - Files: src/actions/lab-reports.ts, src/components/lab-reports/lab-report-detail.tsx
3. Documents module is placeholder-only, despite being part of required core module scope.
   - File: src/app/(app)/documents/page.tsx
4. Public token endpoints lack rate limiting and abuse controls.
   - File: src/app/api/upload/secure-token/route.ts

### C. Medium

1. Weak phone validation in patient schema.
   - File: src/lib/validations/patient.ts
2. Clinical note update versioning is race-prone.
   - File: src/actions/clinical-notes.ts
3. Onboarding server actions allow step progression without strict prerequisite assertions.
   - File: src/actions/onboarding.ts
4. Appointment pre-check is non-atomic (DB index protects data, but UX can still fail late).
   - Files: src/actions/appointments.ts, supabase/migrations/00001_initial_schema.sql
5. Auth callback redirect target is not normalized/allowlisted.
   - File: src/app/api/auth/callback/route.ts

### D. Low

1. Inconsistent treatment of status as derived UI state vs persisted workflow state for appointments.
   - Files: src/actions/appointments.ts, src/components/appointments/appointments-list.tsx
2. LocalStorage-only clinical note templates are convenient but brittle across devices/browsers and not auditable.
   - File: src/components/clinical-notes/document-composer.tsx
3. Minor constants drift (patient code prefix constant not used by generator).
   - Files: src/lib/constants/app.ts, src/actions/patients.ts

## 4. Risks and Fragile Areas

1. Tenant boundary is mostly RLS-driven, but application-level ownership checks are inconsistent. This creates integrity drift even when direct data leaks are blocked.
2. Lab report pipeline currently mixes private storage intent with public URL mechanics, producing significant confidentiality exposure.
3. Public tokenized flows are sensitive and currently lack abuse controls and robust server-side isolation strategy.
4. Complex client-side composer logic (AI staging, templates, snapshots, PDF, sharing) has high behavioral surface area and fragile state coupling.
5. Timeline events are write-heavy and not transactional with all parent operations, which can produce partial audit trails.

## 5. Validation Against peepal.md (Intent vs Implementation)

### Patients
- Intended: robust patient lifecycle management under strict tenant isolation.
- Actual: core CRUD exists, but ownership verification is not consistently enforced at action boundary for related module writes.

### Appointments
- Intended: reliable booking with dietitian-scoped data.
- Actual: booking and availability exist; tenant scope largely works via RLS, but action-level patient ownership validation is missing.

### Clinical Notes
- Intended: clinical documentation with structured workflow and secure tenant boundaries.
- Actual: functional composer and note CRUD exist; integrity checks around patient ownership and concurrent editing are incomplete.

### Lab Reports
- Intended: secure upload (including patient-assisted upload), AI-assisted review, strict isolation.
- Actual: most severe gap. Public upload path is broken under current RLS/client usage, and file privacy is undermined by public URLs.

### Auth and Onboarding
- Intended: secure auth and guided onboarding.
- Actual: primary flow works, but redirect hardening and strict onboarding step enforcement are incomplete.

### Dashboard
- Intended: operational overview.
- Actual: mostly aligned for current scope.

### Documents / Timeline (from peepal.md core modules)
- Documents: currently placeholder only (not aligned with core module expectation).
- Timeline: implemented within patient profile context, but broader operational/document workflow coverage is partial.

## 6. Recommendations (No Implementation)

1. Stabilize lab report security and upload architecture first, before any feature expansion.
2. Enforce app-layer patient ownership checks for every write path accepting patient_id.
3. Align storage privacy model with URL distribution model (private buckets must not rely on unrestricted public URL usage).
4. Define and enforce a strict request contract for AI result persistence and rendering.
5. Add abuse protections for public token endpoints.
6. Add server-side onboarding step guardrails.
7. Complete or explicitly de-scope Documents module to match product commitments in peepal.md.

## 7. Suggested Fix Order (Risk-first)

1. Critical lab upload and file privacy defects.
2. Cross-tenant reference integrity checks across actions.
3. AI analysis ownership and persistence contract issues.
4. Public endpoint abuse controls.
5. Onboarding/auth hardening and medium-level data validation improvements.
