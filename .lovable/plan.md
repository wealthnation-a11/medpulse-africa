# Fixes Needed to Complete the Three Goals

After reviewing the code and database, the scaffolding is in place but three real gaps prevent the features from actually working end‑to‑end.

## Gap 1 — Doctor Screening Intelligence is empty

**Why:** `health_screenings` currently has **0 rows**. The tab renders correctly but there is nothing to show, so "verification" can't be done.

**Fix:**
- Seed 3–5 demo screenings (mix of blood test, genetic, biomarker, imaging) with realistic values and run `analyze-screening` against them so the dashboard, top‑disease list, and risk badges populate.
- Add an empty‑state CTA on the Screening Intelligence tab linking to `/submit-screening` so doctors aren't stuck on a blank panel.

## Gap 2 — Patient Health Timeline can't group readings per patient

**Why:** `health_screenings` has no `patient_identifier` column. Today every submission is a brand‑new anonymous record (age + sex only), so `PatientHealthTimeline` cannot link multiple screenings of the same person — the chart will look correct for one screening but never form a true trend.

**Fix:**
- Add `patient_identifier text` (and optional `patient_name`) to `health_screenings` via migration; index it.
- Add a "Patient ID / MRN" field to step 1 of `ScreeningForm`.
- Update `PatientHealthTimeline` to group by `patient_identifier` and offer a patient selector dropdown, so the chart shows the same biomarker across that patient's screenings over time.

## Gap 3 — Imaging uploads are stored but never analyzed by AI

**Why:** `ScreeningForm` uploads files to the `medical-images` bucket and saves their paths in `test_results.uploaded_images`, but `supabase/functions/analyze-screening/index.ts` only sends a text prompt to `google/gemini-2.5-flash`. Images are ignored, so doctors get no visual diagnosis.

**Fix:**
- In `analyze-screening`, when `screening_type === "imaging"`:
  - Generate short‑lived signed URLs for each uploaded image from the `medical-images` bucket (bucket is private).
  - Switch to a vision‑capable model (`google/gemini-2.5-pro`) and send each image as an `image_url` content part alongside the existing prompt, asking it to describe findings (nodules, fractures, opacities, etc.) before producing the structured `submit_risk_assessments` tool call.
  - Persist the AI's textual imaging findings on the screening (new `imaging_findings text` column) so `ScreeningResults` and the Screening Intelligence detail view can display them.
- Show the imaging findings + thumbnail signed URLs in `ScreeningResults.tsx` for the doctor view.

## Files to touch

- `supabase/migrations/<new>.sql` — add `patient_identifier`, `patient_name`, `imaging_findings` columns + index
- `src/components/screening/ScreeningForm.tsx` — patient ID input
- `src/components/screening/ScreeningResults.tsx` — render imaging findings + previews
- `src/components/dashboard/PatientHealthTimeline.tsx` — group/select by patient
- `src/components/dashboard/ScreeningIntelligence.tsx` — empty‑state CTA
- `supabase/functions/analyze-screening/index.ts` — vision model + signed URLs + save findings
- (one‑time) seed sample screenings for QA

## Out of scope

- Auth/role changes, landing page, outbreak surveillance, admin settings — none of these block the three goals.
