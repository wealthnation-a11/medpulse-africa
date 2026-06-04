# Close the loop: fix items #1–#7

Items #3 (nav filtering) and #4 (smart redirect) are already correct in code (`AppLayout.tsx` scopes Submit/Validate to volunteer/doctor/admin; `Dashboard.tsx` routes admin → `/admin`, others → `/dashboard/{role}`). I'll re-verify but expect no changes. The other 5 need work.

## 1. Patient self-service PDF download

In `PatientDashboard.tsx`:
- Add a "Download my health report" button in the hero (next to MRN badge).
- Handler fetches the patient's screenings, risks, biomarkers, and validations (already loaded in state or via a quick supabase query), builds a `PdfReportInput`, calls `generatePatientPdfReport`, then `downloadPdf(blob, 'my-health-report.pdf')`.
- Reuses existing `src/lib/pdfReport.ts` — no new code path.

## 2. Patient "Book a screening" CTA

In `PatientDashboard.tsx` hero:
- Add a secondary button "Request a screening" that opens a small dialog with a textarea (reason / preferred date) and submits a row into `notifications` targeted at doctors (`type: 'info'`, `category: 'screening_request'`, `severity: 'low'`).
- New helper inserts one notification per doctor (mirrors existing pattern in `notify_doctors_on_high_risk` but client-side). Patients already can't INSERT into `notifications` because of RLS — so this requires either:
  - **Option A (chosen):** New RLS policy: allow patients to insert notifications where `category = 'screening_request'` and the recipient `user_id` belongs to a doctor.
  - Migration adds that policy.

## 3. AppLayout nav filtering (verify only)

Already filters by role. Patient role gets only Dashboard. Confirm and move on.

## 4. `/dashboard` smart redirect (verify only)

Already correct. Confirm and move on.

## 5. Doctor sign-off → patient notification

Add a Postgres trigger `notify_patient_on_signoff` on `screening_validations` AFTER INSERT/UPDATE when `signed_off_at IS NOT NULL`:
- Look up the related screening's `patient_identifier`.
- Find the patient user via `profiles.patient_identifier`.
- Insert into `notifications` with `category='signoff'`, `severity` matching `corrected_risk_level` (or 'low' when confirmed/dismissed), title "Your screening was reviewed", message includes doctor decision summary, `related_id = screening_id`.
- Skip if no matching patient profile.

## 6. Profile MRN edit

- New page `src/pages/ProfileSettings.tsx` with form: `display_name`, `patient_identifier` (MRN), `default_location`.
- Save via `supabase.from('profiles').update(...).eq('user_id', user.id)`.
- Add a "Settings" link in `AppLayout` user menu (the small avatar block) → `/profile`. Show for all roles.
- Route added to `App.tsx`.

## 7. Sign-off feedback into displayed risk

- In `ScreeningResults.tsx` (used by patient + doctor views): fetch the latest `screening_validations` row for the screening.
- If `corrected_risk_level` is present, render a "Doctor-revised risk: {level}" banner above AI risk bars with the doctor's notes; visually outrank the AI percentage (AI shown but greyed/struck-through).
- In `PatientDashboard.tsx` "Risk Insights" tab and `PatientsList.tsx`/`PatientProfile.tsx` risk overview: when a screening has a corrected_risk_level, use it for sorting/highlighting instead of the raw AI percentage.

## Technical details

- **Migration** (one file):
  1. New RLS policy on `notifications`: patients can INSERT when `category = 'screening_request'` AND target user has `doctor` role.
  2. New function `notify_patient_on_signoff()` (SECURITY DEFINER, `set search_path = public`).
  3. Trigger `trg_notify_patient_on_signoff` AFTER INSERT OR UPDATE ON `screening_validations`.
- **Code changes**:
  - `src/components/dashboard/PatientDashboard.tsx` — PDF button + screening request dialog.
  - `src/components/screening/ScreeningResults.tsx` — fetch + show doctor-revised banner.
  - `src/components/AppLayout.tsx` — link user block to `/profile`.
  - `src/pages/ProfileSettings.tsx` (new) — MRN/profile form.
  - `src/App.tsx` — route for `/profile`.
- **No changes** to `Dashboard.tsx` or nav role filtering (already correct).

## Out of scope

- Doctor-side scheduling UI for screening requests (notification is the handoff).
- Editing past MRN-linked records when patient changes their MRN.
- Versioned audit trail of doctor revisions (single latest validation used).
