# Strengthen the AI: close gaps #1–#5

Goal: turn `analyze-screening` from a single-shot risk scorer into a longitudinal, explainable, self-improving early-detection engine — and make AI vs rule-based disagreement visible to clinicians.

## 1. Validation feedback loop into AI prompts

When a doctor signs off a screening with a `corrected_risk_level` or `corrected_disease`, those become labeled few-shot examples for future analyses of the same patient (and, for population-level features, the same age/sex cohort).

- New table `ai_feedback_examples` (server-curated, not user-editable):
  - `screening_id`, `disease_name`, `ai_risk_percentage`, `corrected_risk_level`, `doctor_notes`, `patient_age`, `patient_sex`, `created_at`.
- Postgres trigger on `screening_validations` AFTER INSERT/UPDATE (when `signed_off_at` set & `corrected_risk_level` present): copy a denormalized row in. Skip if AI risk ≈ corrected (no learning signal).
- `analyze-screening` queries the **5 most recent** matching cohort examples (same sex + age ±10y, prioritizing the same patient) and injects them as a "Past clinician corrections — calibrate against these" block before the patient data.
- No fine-tuning; pure in-context calibration. Cheap, auditable, immediate.

## 2. Longitudinal context per patient

Currently each analysis sees only the current screening. Change `analyze-screening` to pre-load and inject the patient's history before prompting.

- Resolve `patient_identifier` (already on `health_screenings`). Fetch all prior screenings for that identifier (`created_at`, `screening_type`, key `test_results`, `imaging_findings`).
- Fetch prior `biomarker_profiles` rows for those screenings.
- Run existing `trendAnalysis.computeTrendInsights` server-side over the merged biomarker series to derive velocity/projection per biomarker.
- Inject into the prompt as:
  - Patient timeline (chronological summary of past screenings).
  - Trend deltas table (biomarker, current, 12-mo projection, slope/yr, severity).
- Update the system prompt to require the model to "explicitly reason over trajectory, not just current values, when assigning risk_percentage and time_horizon".

## 3. AI rationale & citations

Extend the `submit_risk_assessments` tool schema with two new required fields per assessment:

```
rationale: string         // 2–4 sentence plain-English reasoning grounded in this patient's data
evidence: string[]        // short bullets citing the specific values/trends used,
                          // e.g. "HbA1c 6.4% (above 5.7% threshold)"
                          // or "LDL trending +18 mg/dL/yr over 3 screenings"
```

- Store `rationale` and `evidence` as new columns on `disease_risk_assessments` (`text` and `jsonb`).
- Render them inline in `ScreeningResults.tsx` under each disease card (collapsible "Why this risk?" panel) and in `PatientProfile.tsx` for doctors.
- Keep schema lean to avoid Gemini "too many states" errors (no enums, no length bounds).

## 4. AI vs rule-based disagreement flagging

The rule engine (`riskCalculation.ts`) already produces a rule-based risk level for observations. Extend the pattern to screenings:

- Add a lightweight rule scorer for screenings (`ruleScoreScreening`) that maps abnormal biomarkers → coarse risk (`Low/Medium/High`) using the existing `refRanges`.
- In `analyze-screening`, compute the rule-based level, then for each AI assessment derive an AI level (≥60% = High, 30–60 = Medium, <30 = Low).
- Persist a new column on `disease_risk_assessments`: `rule_based_level text` and `disagreement boolean` (true when rule vs AI differ by 2+ steps, e.g. Low vs High).
- A new trigger `notify_doctors_on_ai_disagreement` inserts a `category='ai_disagreement'` notification for doctors when `disagreement = true`.
- UI: in `ScreeningResults.tsx` and `SignOffQueue.tsx`, show a "Models disagree" badge with both levels side-by-side; sort sign-off queue by disagreement first.

## 5. Imaging segmentation/overlay (lightweight)

True pixel-level segmentation needs a specialized model. Ship a useful approximation now:

- Extend `submit_imaging_findings` tool with a `regions` array:
  ```
  regions: [{ label: "Right upper lobe opacity", bbox_pct: [x, y, w, h], severity: "low|medium|high" }]
  ```
  `bbox_pct` is the model's best-effort normalized rectangle (0–1) on the image; we accept it as advisory, not diagnostic.
- Store as `imaging_regions jsonb` on `health_screenings`.
- New component `ImagingOverlay.tsx`: renders the signed-URL image with absolutely-positioned, color-coded boxes from `bbox_pct` (red/amber/green by severity), each clickable to show the label. Reused inside `ImagingGallery.tsx`.
- Add a disclaimer banner: "AI-suggested regions are advisory; not pixel-accurate."

## Technical details

**Migration (one file):**
1. `CREATE TABLE public.ai_feedback_examples (...)`, GRANT to `service_role` only (read+insert from edge function); GRANT SELECT to `authenticated` for admin visibility, gated by RLS to `is_admin()`.
2. ALTER `disease_risk_assessments` ADD COLUMNS `rationale text`, `evidence jsonb DEFAULT '[]'::jsonb`, `rule_based_level text`, `disagreement boolean DEFAULT false`.
3. ALTER `health_screenings` ADD COLUMN `imaging_regions jsonb DEFAULT '[]'::jsonb`.
4. Function `record_ai_feedback_example()` + trigger `trg_record_ai_feedback_example` on `screening_validations`.
5. Function `notify_doctors_on_ai_disagreement()` + trigger on `disease_risk_assessments` AFTER INSERT.

**Edge function `analyze-screening` changes:**
- Pre-fetch prior screenings + biomarkers for `patient_identifier`.
- Compute trends (port the small `trendAnalysis` math into the Deno file — no shared deps).
- Compute rule-based level from biomarkers vs reference ranges.
- Fetch top-5 cohort feedback examples.
- Build augmented prompt: history block + trends table + cohort calibration block + current screening.
- Tool schemas updated for `rationale`, `evidence`, and `regions`.
- After AI response: derive AI level per disease, compare to rule-based, set `disagreement` on each insert.
- Backwards compatible: callers don't change.

**Frontend changes:**
- `src/components/screening/ScreeningResults.tsx`: per-disease "Why this risk?" expandable; "Models disagree" badge when applicable.
- `src/components/dashboard/SignOffQueue.tsx`: sort + badge for disagreement.
- New `src/components/screening/ImagingOverlay.tsx`; integrate into `ImagingGallery.tsx`.
- `src/integrations/supabase/types.ts` regenerates after migration.

**Out of scope:**
- True fine-tuning or RAG over an external medical corpus.
- Pixel-accurate segmentation (would need a vision-specialized model + GPU).
- Backfilling rationale/evidence/rule-based levels for screenings already analyzed (only new analyses get the fields).
- Patient-facing rationale UI (doctors first; can roll out to patients later).

## Rollout order

1. Migration (schema + triggers).
2. `analyze-screening` rewrite (longitudinal + rationale + rule-based + regions).
3. UI surfaces (rationale panel, disagreement badge, imaging overlay).
4. Sign-off queue prioritization.
