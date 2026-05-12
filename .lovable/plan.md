# Close the Clinical Loop: 4-Feature Build

Bundle covering screening notifications + sign-off, patient profile, PDF reports, and trend-based risk deltas.

---

## 1. Screening notifications + doctor sign-off

**Goal:** When a screening is analyzed and flagged high-risk, doctors get notified and can formally sign off, validate, or override the AI's assessment.

**Database**
- New table `screening_validations` (mirrors `doctor_validations` but for screenings):
  - `screening_id`, `doctor_id`, `validation_status` (pending/confirmed/revised/dismissed), `corrected_risk_level`, `doctor_notes`, `signed_off_at`
- Postgres trigger on `disease_risk_assessments` insert: when any assessment ≥ high-risk threshold (from `platform_settings`), insert a notification row for every user with the `doctor` role.
- Add `severity` ('low'|'medium'|'high') and a `category` ('screening'|'observation') column to `notifications` for filtering.

**Backend**
- Update `analyze-screening` so after assessments are saved it does NOT need to push notifications manually — the trigger handles it.

**UI**
- Doctor dashboard → new **"Sign-Off Queue"** tab listing screenings where AI flagged high risk and `screening_validations` has no entry yet.
- Sign-off panel: show AI assessment + biomarkers + imaging findings; doctor selects Confirm / Revise risk / Dismiss + free-text notes → writes to `screening_validations`, also flips screening status to `validated`.
- `NotificationBell` already exists — extend it to render screening notifications and deep-link to the sign-off panel.

---

## 2. Patient profile page

**Goal:** One URL per patient (`/patient/:patientIdentifier`) consolidating everything about them.

**Route & layout** — new page `src/pages/PatientProfile.tsx` with sections:
1. **Header card** — patient ID, name, age, sex, latest screening date, current overall risk badge.
2. **Risk overview** — top 3 disease risks (latest values) as colored cards.
3. **Screenings timeline** — chronological list, click to open the existing `ScreeningResults` view inline.
4. **Biomarker trends** — reuse `PatientHealthTimeline` filtered to this patient, plus the new trend-delta indicators (see #4).
5. **Imaging gallery** — thumbnails with signed URLs from `medical-images`, click to open full-size + AI findings.
6. **Doctor sign-offs** — list of `screening_validations` for this patient.
7. **Action bar** — "Generate PDF report" + "Submit new screening for this patient" buttons.

**Discoverability**
- Doctor dashboard → new **"Patients"** tab: searchable list of distinct `patient_identifier` values with last-screening date and current top risk.
- `ScreeningIntelligence` recent-screenings rows link to the patient profile (in addition to the current detail view).

---

## 3. PDF report generator

**Goal:** One-click downloadable patient report.

**Approach** — client-side using `jspdf` + `jspdf-autotable` (no edge function, no extra secrets).

**Report contents**
- Header: MedPulse logo, patient demographics, report date, generating clinician.
- Executive summary: latest overall risk level + sign-off status.
- Disease risk table: disease, risk %, confidence, time horizon, recommended actions.
- Biomarker trend section: per-marker latest value, reference range, abnormal flag, mini sparkline rendered to canvas via `recharts`-to-image OR drawn directly with jsPDF lines.
- Imaging findings: thumbnails (fetched as base64 from signed URLs) + AI textual findings.
- Doctor notes from sign-offs.
- Footer disclaimer: "AI-assisted analysis, not a diagnosis."

**Where**
- "Generate PDF report" button on Patient Profile page and on individual `ScreeningResults` view.

---

## 4. Trend-based risk deltas

**Goal:** Detect when a biomarker is *trending* toward abnormal even while still in range — the actual early-detection signal.

**Logic** (new `src/lib/trendAnalysis.ts`)
- For each biomarker with ≥ 2 readings for the same `patient_identifier`:
  - Compute slope (value change per 30 days) using simple linear regression.
  - Project value 6 / 12 / 24 months out.
  - Classify trend as: `stable`, `improving`, `concerning` (heading out of range within 12 months), or `critical` (already abnormal AND worsening).
- Disease-specific velocity rules (from medical literature):
  - PSA velocity > 0.75 ng/mL/year → elevated prostate cancer risk
  - HbA1c rising > 0.3%/year → pre-diabetic trajectory
  - LDL rising > 10 mg/dL/year → cardiovascular trajectory
  - Creatinine rising > 0.2 mg/dL/year → kidney decline
- Output per patient: array of `TrendInsight { biomarker, currentValue, slope, projectedValue, monthsToAbnormal, severity, suggestedDisease }`.

**UI surfaces**
- New `TrendInsightsPanel` component on Patient Profile + Doctor dashboard "Insights" tab.
- Color-coded badges (green stable, amber concerning, red critical) with plain-English explanation: *"LDL rising 12 mg/dL/yr — cardiovascular risk trajectory; recommend lipid panel in 3 months."*
- Annotate `PatientHealthTimeline` charts with trend arrows + projected dotted-line extension.

---

## Technical Notes

**Files to create**
- `supabase/migrations/<new>.sql` — `screening_validations` table + RLS, `notifications` columns, high-risk trigger function
- `src/pages/PatientProfile.tsx`
- `src/components/dashboard/SignOffQueue.tsx`
- `src/components/dashboard/PatientsList.tsx`
- `src/components/patient/PatientHeader.tsx`
- `src/components/patient/ImagingGallery.tsx`
- `src/components/patient/TrendInsightsPanel.tsx`
- `src/components/patient/SignOffPanel.tsx`
- `src/lib/trendAnalysis.ts`
- `src/lib/pdfReport.ts` (jsPDF generator)

**Files to edit**
- `src/App.tsx` — add `/patient/:id` route
- `src/components/dashboard/DoctorDashboard.tsx` — add Sign-Off, Patients, Insights tabs
- `src/components/dashboard/ScreeningIntelligence.tsx` — link to patient profile
- `src/components/dashboard/PatientHealthTimeline.tsx` — overlay projected trend lines
- `src/components/screening/ScreeningResults.tsx` — add "Generate PDF" + "View patient profile" buttons
- `src/components/NotificationBell.tsx` — handle screening notifications

**Dependencies**
- `jspdf`, `jspdf-autotable` (PDF generation)

**Out of scope**
- Patient-facing portal (separate role — flagged as future work)
- Email/SMS notification delivery (in-app only for now)
- DICOM imaging support
