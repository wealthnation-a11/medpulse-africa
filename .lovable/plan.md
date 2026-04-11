

# MedPulse Evolution: Early Disease Detection & Diagnostics Platform

## Vision

Transform MedPulse from a community symptom reporting tool into a comprehensive **early disease detection platform** that combines blood test analysis, genetic screening, and biomarker tracking to detect diseases like cancer and heart conditions years before symptoms appear — while retaining the existing outbreak surveillance capabilities.

## What Changes

### 1. Landing Page Overhaul
- Rewrite hero section: new headline emphasizing "Detect Disease Years Before Symptoms"
- Update "How It Works" to a 4-step pipeline: **Sample Collection → Blood & Genetic Analysis → AI Biomarker Detection → Early Intervention**
- New "Capabilities" section showcasing: Blood Test Analysis, Genetic Screening, Biomarker Tracking, Outbreak Surveillance
- Updated trust indicators and mission/about text

### 2. New Database Tables (via migrations)
- **`health_screenings`** — stores patient screening submissions (patient demographics, screening type: blood_test / genetic / biomarker, test results as JSONB, risk scores, AI analysis results, linked to submitter)
- **`biomarker_profiles`** — tracks individual biomarker readings over time (biomarker name, value, unit, reference range, trend direction, linked to screening)
- **`disease_risk_assessments`** — AI-generated risk profiles per screening (disease name, risk percentage, confidence, time horizon e.g. "5 years", recommended actions)

### 3. Screening Submission Form (new page `/submit-screening`)
- Multi-step form for doctors/volunteers to submit diagnostic data:
  - **Patient Info**: age, sex, family history checkboxes (cancer, heart disease, diabetes, etc.)
  - **Screening Type**: blood test, genetic screening, or biomarker panel
  - **Test Results**: dynamic fields based on type — e.g. blood test shows CBC values, lipid panel, tumor markers; genetic shows gene variants; biomarker shows PSA, troponin, HbA1c, etc.
  - **Clinical Notes**: free text
- On submit: saves to `health_screenings`, triggers AI analysis via edge function

### 4. AI Analysis Edge Function (`analyze-screening`)
- Receives screening data (patient info, test type, results, biomarkers)
- Uses Lovable AI to generate structured output:
  - Disease risk assessments (cancer risk %, heart disease risk %, diabetes risk %, etc.)
  - Confidence scores and time horizons
  - Recommended follow-up actions
  - Biomarker trend analysis
- Saves results to `disease_risk_assessments` table

### 5. Doctor Dashboard Enhancements
- New **"Screening Intelligence"** tab alongside existing outbreak monitoring
- Patient risk matrix: heatmap of patients by disease risk level
- Biomarker trend charts: track individual biomarkers over time
- AI risk assessment cards showing top disease risks with confidence bars
- Screening pipeline: pending → analyzed → reviewed → actioned

### 6. Volunteer Dashboard Enhancements
- New **"My Screenings"** section showing submitted screening results
- Personal health risk summary with AI-generated insights
- Biomarker history timeline
- Keep existing community reporting features

### 7. Enhanced Risk Calculation (`riskCalculation.ts`)
- Add `calculateScreeningRisk()` function that factors in:
  - Age, sex, family history
  - Biomarker values vs. reference ranges
  - Number of abnormal markers
  - Screening type weighting
- Provides preliminary risk before AI analysis runs

### 8. Admin Dashboard Updates
- System-wide screening analytics (total screenings, risk distribution)
- Disease detection statistics (cancers flagged, cardiac risks identified)
- Screening vs. observation comparison metrics

## Technical Details

**New files to create:**
- `src/pages/SubmitScreening.tsx` — screening submission page
- `src/components/screening/ScreeningForm.tsx` — multi-step form
- `src/components/screening/ScreeningResults.tsx` — results display
- `src/components/dashboard/ScreeningIntelligence.tsx` — doctor screening tab
- `src/components/dashboard/BiomarkerChart.tsx` — biomarker trend visualization
- `supabase/functions/analyze-screening/index.ts` — AI analysis edge function

**Files to modify:**
- `src/pages/Index.tsx` — updated landing sections
- `src/components/landing/HeroSection.tsx` — new messaging
- `src/components/landing/HowItWorks.tsx` — new pipeline steps
- `src/components/landing/AboutSection.tsx` — updated mission
- `src/components/landing/AudienceCards.tsx` — updated audience descriptions
- `src/components/landing/CTABanner.tsx` — updated CTA
- `src/components/dashboard/DoctorDashboard.tsx` — add screening tab
- `src/components/dashboard/VolunteerDashboard.tsx` — add screenings section
- `src/pages/AdminDashboard.tsx` — add screening analytics
- `src/App.tsx` — add `/submit-screening` route
- `src/components/AppLayout.tsx` — add screening nav link
- `src/lib/riskCalculation.ts` — add screening risk logic

**Database migrations:**
- Create `health_screenings`, `biomarker_profiles`, `disease_risk_assessments` tables with RLS
- Enable realtime on `health_screenings`

**Edge function:**
- `analyze-screening` using Lovable AI with structured tool-calling output for disease risk assessments

