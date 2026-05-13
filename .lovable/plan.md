# Three Distinct Dashboards

## Why the dashboards look the same today

- `Volunteer` and `Doctor` dashboards are technically separate files, but they share the same hero layout pattern and tab style, so they feel similar at a glance.
- There is **no Patient role** in the system at all (`app_role` enum is only `volunteer | doctor | admin`), and the auth screen only offers Volunteer/Doctor. Anything labeled "Login as patient" today routes through Volunteer.
- Everyone lands on `/dashboard` which then branches by role inside one component — making the three experiences hard to differentiate visually and architecturally.

## What I'll build

### 1. Add `patient` role
- Migration: extend `app_role` enum to include `'patient'`.
- Update `Auth.tsx` role picker to show three cards: Volunteer / Doctor / Patient.
- Update `useAuth`, `ProtectedRoute`, `AppLayout` nav filtering.
- On signup, a patient row is auto-created in a new `patients` table (or reuses `health_screenings.patient_identifier`) tied to `auth.uid()` so their own data shows up.

### 2. Three dedicated routes (separate pages, separate URLs)

```
/dashboard/doctor      → DoctorDashboardPage
/dashboard/volunteer   → VolunteerDashboardPage
/dashboard/patient     → PatientDashboardPage
/dashboard             → smart redirect based on role
```

Each is a real `pages/` file (not just a sub-component), wrapped in `ProtectedRoute` with the right role.

### 3. Page structures

**DoctorDashboardPage** (clinical command center — dark/clinical theme)
- Header: "Clinical Intelligence Hub", pending case counter, quick actions (New Screening, Review Cases)
- Tabs: Screening Intelligence · Sign-Off Queue · Patients · Health Timeline · Outbreak Surveillance
- Metrics: high-risk pending, validation rate, geographic coverage
- AI outbreak prediction + Africa heatmap
- (Reuses existing `DoctorDashboard.tsx` content, moved into its own page)

**VolunteerDashboardPage** (community reporter — bright/friendly theme)
- Header: "Community Health Reporter" with impact score, quick actions (Report Observation, Submit Screening)
- Tabs: My Submissions · Community Reports
- Metrics: reports filed, validated, regions covered, impact score
- Recent submissions list with status dots
- "How to increase your impact" tips card
- No clinical review tools, no patient lists

**PatientDashboardPage** (personal health — calm/wellness theme) — NEW
- Header: "My Health Hub" with personal greeting, next-action card
- Tabs:
  - **My Screenings** — list of own `health_screenings` with results and risk levels
  - **My Health Timeline** — biomarker trend charts (BP, glucose, cholesterol, etc.) over time
  - **My Risk Insights** — current disease risk assessments + plain-language explanations
  - **My Imaging** — uploaded X-ray/MRI/CT scans with doctor notes
  - **Notifications** — sign-offs and alerts from doctors
- Metrics: screenings count, last checkup date, top risk, doctor sign-offs received
- CTA: "Book a screening" / "Download my health report (PDF)"
- Read-only — patients cannot review others or submit observations

### 4. Smart redirect at `/dashboard`
After login, look at role and `Navigate` to `/dashboard/{role}`. Admin still goes to `/admin`.

## Technical details

- Migration: `ALTER TYPE app_role ADD VALUE 'patient';` + update `user_roles` insert RLS to allow self-insert of `'patient'`.
- New page files: `src/pages/DoctorDashboardPage.tsx`, `src/pages/VolunteerDashboardPage.tsx`, `src/pages/PatientDashboardPage.tsx`.
- New components: `src/components/dashboard/PatientDashboard/{HealthHub.tsx, MyScreenings.tsx, MyTimeline.tsx, MyRiskInsights.tsx, MyImaging.tsx}`.
- Patient data scoping: `health_screenings` already has `submitted_by`. For a patient, query `submitted_by = auth.uid()` OR `patient_identifier = profile.patient_identifier`. Add `patient_identifier` column to `profiles` so a patient's record can be linked to screenings entered by doctors/volunteers.
- RLS update: patients can SELECT screenings where `patient_identifier = (their profile)`.
- Update `App.tsx` routes, `AppLayout` nav (hide Submit/Validate for patients), `ProtectedRoute` for `requiredRole="patient"`.
- Visual differentiation: each dashboard gets a distinct hero gradient, icon set, and tab palette so they read as clearly different products.

## Out of scope (this round)
- Patient-to-doctor messaging
- Appointment booking
- Patient self-uploading screenings (still doctor/volunteer entered)
