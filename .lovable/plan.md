# Strengthen early detection: scheduler, ID matching, self-reports, FHIR

Four additions that turn the AI from "detects early *if* data arrives" into "actively pulls the data it needs."

---

## 1. Auto follow-up scheduler

Goal: when any biomarker's projected 12-month value crosses an abnormal threshold (using the slope math already in `analyze-screening`), automatically create a screening request to the responsible doctor a sensible number of months out.

- Extend `analyze-screening` (after trend computation) with a `scheduleFollowUps()` step:
  - For each biomarker with `n ≥ 2` points and a non-null slope, compute months-until-crossing the nearest abnormal bound from `refRanges`. If `0 < months ≤ 18`, schedule at `max(1, floor(months * 0.5))` months (catch it halfway to the threshold). Severe trends (≤3 months) schedule at 1 month.
  - Deduplicate: don't schedule the same biomarker for the same `patient_identifier` more than once per 60 days.
- New table `screening_follow_ups`:
  - `patient_identifier`, `screening_id` (origin), `biomarker_name`, `projected_value`, `threshold_value`, `due_at timestamptz`, `reason text`, `status text default 'pending'` (`pending|notified|completed|dismissed`), `assigned_doctor_id` (nullable; defaults to last sign-off doctor or any doctor in patient's history), timestamps.
  - GRANTs: `authenticated` SELECT/UPDATE for doctors and the patient themselves; `service_role` ALL.
  - RLS: doctors/admins read all; patient reads own via `current_patient_identifier()`; only doctors/admins update.
- Cron worker `process-follow-ups` (Supabase edge function + `pg_cron` every hour):
  - For rows where `due_at <= now()` and `status='pending'`: insert a `notifications` row (`category='screening_followup'`, `severity='medium'`) to `assigned_doctor_id` and, if the patient has a linked account, to the patient too. Flip `status='notified'`.
- UI:
  - `DoctorDashboard.tsx`: new "Upcoming follow-ups" card listing due/overdue items with patient + biomarker + projected value, mark-complete/dismiss buttons.
  - `PatientDashboard.tsx`: "Recommended next screening" card.
  - `NotificationBell.tsx` already handles new categories — just render the `screening_followup` label.

## 2. Patient ID normalization (fuzzy name + DOB)

Goal: stop broken longitudinal histories when the same patient is entered as "John Smith / 1980-04-12" once and "Jon Smith / 12 Apr 1980" the next time.

- Add to `health_screenings`: `patient_dob date` (nullable; existing rows allowed null) and `patient_name_normalized text` (lowercased, punctuation-stripped, single-spaced).
- New table `patient_directory`:
  - `id uuid pk`, `canonical_identifier text unique`, `display_name`, `dob date`, `sex`, `aliases jsonb` (array of `{name, dob, source_screening_id}`), `created_at`, `updated_at`.
  - GRANTs: doctors/admins read+write; volunteers read+insert; service_role ALL.
- Postgres function `public.match_or_create_patient(in_name text, in_dob date, in_sex text)` (SECURITY DEFINER):
  - Normalize input name. Search `patient_directory` for `dob = in_dob AND similarity(display_name_normalized, in_name_normalized) >= 0.6` using `pg_trgm` (`CREATE EXTENSION IF NOT EXISTS pg_trgm`).
  - Tiebreak by highest similarity then most recent activity. Return existing `canonical_identifier` or insert a new one (`generate_patient_id()` = `PT-` + short ulid).
  - Append the submitted name to `aliases` if it's a new variant.
- Trigger `before_insert_health_screenings`: if `patient_identifier` is blank or matches an existing alias, call `match_or_create_patient` to resolve it; always set `patient_name_normalized`.
- `ScreeningForm.tsx`: add a `Date of birth` input; submit name+DOB to the trigger (rather than constructing IDs client-side). Show "Matched existing patient: PT-XXXX (3 prior screenings)" preview using an RPC `preview_patient_match`.
- Backfill: one-shot migration that populates `patient_name_normalized` for existing rows and runs the matcher to consolidate obvious duplicates (only when DOB present + similarity ≥ 0.8 — conservative).

## 3. Self-reported screenings (volunteer / patient channel)

Goal: let volunteers (and patients themselves) submit lightweight home-device readings between clinic visits so trends keep updating.

- Add to `health_screenings`: `source text default 'clinical'` with allowed values `clinical | self_reported | device_import | fhir`. Add a CHECK-via-trigger validation (per project rule, not CHECK constraint).
- New screening sub-type `self_reported` accepts a narrow whitelist of biomarkers (`glucose`, `systolic_bp`, `diastolic_bp`, `weight_kg`, `pulse`, `spo2`, `temperature_c`, `hba1c_home`). Extend `refRanges` with BP + SpO2.
- RLS update on `health_screenings`:
  - Allow `is_volunteer()` to INSERT when `source='self_reported'`.
  - Allow `is_patient()` to INSERT when `source='self_reported'` AND `patient_identifier = current_patient_identifier()`.
- `analyze-screening` already merges all prior screenings into `trendsBySeries`; just include `source` in the prompt so the model can weight clinical vs self-reported (we tell it: "treat self_reported as advisory; do not let a single outlier flip risk class").
- UI:
  - New page `src/pages/SelfReportedScreening.tsx` with a simple form (device type, reading, taken-at datetime, notes). Reused by both volunteer and patient dashboards (route guarded by role).
  - `PatientHealthTimeline.tsx`: badge self-reported entries with a "Home" pill so doctors visually distinguish them.
  - `SignOffQueue.tsx`: self-reported screenings skip the sign-off queue (auto-status `analyzed`, no validator required) unless they triggered a disagreement or high-risk alert.
- AI analysis: self-reported screenings still call `analyze-screening` but with `priority='low'` (cheaper model only — `gemini-2.5-flash` always, even for imaging — and skip cohort few-shots if `n<2` to avoid noise).

## 4. HL7/FHIR ingestion for lab data

Goal: accept FHIR R4 `Observation`, `DiagnosticReport`, and `Patient` resources from external lab systems and convert them into `health_screenings` + `biomarker_profiles` rows.

- New edge function `fhir-ingest` (POST, JWT-protected, doctors/admins/service-account only):
  - Accepts a single FHIR resource or a `Bundle`. Validates with Zod schemas covering the subset we use (`Patient`, `Observation`, `DiagnosticReport`, `Specimen`).
  - LOINC → internal biomarker map (`src/lib/loincMap.ts`, mirrored in the edge function): `4548-4 → hba1c`, `2339-0 → glucose`, `2093-3 → cholesterol_total`, `13457-7 → ldl`, `2085-9 → hdl`, `2160-0 → creatinine`, `2857-1 → psa`, `6598-7 → troponin`, `1988-5 → crp`, `3016-3 → tsh`, `2276-4 → ferritin`, `1989-3 → vitamin_d`, `718-7 → hemoglobin`, `6690-2 → wbc`. Skip unmapped codes (logged, returned in response as `skipped[]`).
  - Resolves patient: `Patient.identifier` (preferred) → `patient_directory` lookup → fall back to `match_or_create_patient(name, dob, sex)` from #2.
  - Groups Observations by `effectiveDateTime` (per encounter) and inserts one `health_screenings` row per group with `source='fhir'`, `screening_type='lab_panel'`, populated `test_results` (numeric only — units converted to our canonical units where possible) and `clinical_notes` capturing the source `DiagnosticReport.conclusion`.
  - Triggers `analyze-screening` for each new screening.
  - Returns `{ created_screenings, biomarkers, skipped, warnings }`.
- New table `fhir_ingest_logs`:
  - `id`, `received_at`, `source_system text`, `bundle_id text`, `resource_count int`, `created_count int`, `error jsonb`, `payload_size int`. Admin-only RLS.
- Auth options:
  - Doctor/admin user JWT (default).
  - Optional `fhir_ingest_tokens` table (`token_hash`, `label`, `last_used_at`, `created_by`) so external lab systems authenticate without a user session; admin UI to mint/revoke tokens. Token compared against header `X-FHIR-Ingest-Token`.
- UI:
  - `AdminSettings.tsx`: "FHIR ingestion" panel — endpoint URL, token management, recent ingest log table.
  - `PatientHealthTimeline.tsx`: lab panels show a "Lab (FHIR)" badge with source system.
- Out of scope (call out explicitly in admin UI):
  - HL7 v2 (pipe-delimited) — only FHIR R4 JSON in this pass.
  - Outbound FHIR export.
  - Imaging via DICOMweb — separate effort.

---

## Technical details

**Migrations (in order):**
1. `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
2. Add `patient_dob`, `patient_name_normalized`, `source` columns to `health_screenings`; add validation trigger for `source`.
3. `CREATE TABLE public.patient_directory (...)` + GRANTs + RLS + `match_or_create_patient()` + `preview_patient_match()` + `generate_patient_id()` + `before_insert_health_screenings` trigger.
4. `CREATE TABLE public.screening_follow_ups (...)` + GRANTs + RLS + `update_updated_at` trigger.
5. `CREATE TABLE public.fhir_ingest_logs (...)` + `fhir_ingest_tokens (...)` + GRANTs + admin-only RLS.
6. RLS additions on `health_screenings` for self-reported inserts by volunteers/patients.
7. Backfill `patient_name_normalized` + conservative consolidation pass.
8. `pg_cron` job to invoke `process-follow-ups` hourly (uses `pg_net`; stored via the insert tool, not migration tool, per project rules).

**Edge functions:**
- `analyze-screening`: add `scheduleFollowUps()` after the trends block; respect `source` in prompt; cheaper model on `self_reported`.
- `process-follow-ups` (new): hourly cron; promotes due rows to notifications.
- `fhir-ingest` (new): Zod-validated FHIR R4 ingestion with LOINC map, patient resolution, and per-encounter screening grouping.

**Frontend:**
- New: `src/pages/SelfReportedScreening.tsx`, `src/components/dashboard/FollowUpsCard.tsx`, `src/components/admin/FhirIngestionPanel.tsx`, `src/lib/loincMap.ts`.
- Edits: `ScreeningForm.tsx` (DOB + match preview), `PatientHealthTimeline.tsx` (source badges), `PatientDashboard.tsx` + `DoctorDashboard.tsx` (follow-ups card), `SignOffQueue.tsx` (skip self-reports unless flagged), `AdminSettings.tsx` (FHIR panel + token mgmt), routing in `App.tsx`.

**Out of scope:**
- Two-way FHIR sync, HL7 v2, DICOMweb, ML-based patient matching (we use trigram + DOB exact), SMS reminders (still in-app/email only), insurance/billing fields.

## Rollout order

1. Migrations 1–7 (schema + patient matching + follow-up table + FHIR log/token tables).
2. `analyze-screening` rewrite (scheduler + source-aware).
3. `process-follow-ups` + cron registration (migration 8).
4. Self-reported screening UI + RLS verification.
5. `fhir-ingest` edge function + admin UI.
6. Backfill + consolidation pass.
