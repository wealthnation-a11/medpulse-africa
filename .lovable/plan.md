

# MedPulse – AI-Driven Disease Detection System

## Overview
A public health intelligence platform with a marketing landing page, volunteer health observation submissions, rule-based disease risk detection, visual dashboards, doctor validation portal, and role-based access — designed for pan-African coverage.

---

## 1. Public Landing Page
A polished, conversion-focused marketing page with:
- **Sticky header** with MedPulse logo, nav links (Home, How It Works, Dashboard, About, Contact), and CTA buttons ("Submit Health Observation" + "Join as Doctor")
- **Hero section** with headline, subheadline, two CTA buttons, and an illustrated Africa map graphic with health icons and highlighted hotspots
- **How It Works** — 3-step visual layout (Community Reporting → Risk Analysis → Alerts & Action)
- **Live Dashboard Preview** — a teaser section showing sample risk data, predicted diseases, confidence scores, and chart placeholders
- **Who MedPulse Is For** — 3 audience cards (Volunteers, Doctors, NGOs) with role-specific CTAs
- **About / Mission** section
- **Final CTA banner** — "See Something. Report It. Save Lives."
- **Footer** with contact email, social links, privacy/terms, and copyright

---

## 2. Authentication & User Roles
- **Email & password** signup/login using Supabase Auth
- **User profiles table** storing display name, default location, and created_at
- **Roles system** with a separate `user_roles` table (volunteer, doctor, admin) using security-definer functions to prevent privilege escalation
- **Role selection** during signup (volunteer or doctor)
- Protected routes that check role before granting access

---

## 3. Database Schema
Three core tables with Row-Level Security:
- **Profiles** — linked to auth.users, stores display name and default location
- **Observations** — submitted by volunteers, includes symptoms (multi-select), location (country, region/state, city), case count, environmental data, rule-based risk level, AI fields (prepared but optional), status (pending/validated/rejected)
- **Doctor Validations** — links a doctor to an observation with validation status, corrected disease, and notes

---

## 4. Volunteer Submission Form
A multi-section form for submitting health observations:
- **Location fields**: Country, Region/State, City (free-text inputs for pan-African flexibility)
- **Symptoms**: Checkboxes (fever, cough, diarrhea, headache, rash)
- **Cases count**: Number of people affected
- **Environmental context**: Temperature, rainfall, optional notes
- On submit: saves to database, runs rule-based risk logic, shows instant risk feedback to the volunteer (Low / Medium / High with color-coded badge)

---

## 5. Rule-Based Risk Detection (MVP)
Automatic risk scoring on each submission:
- **High**: cases ≥ 10 AND symptoms include both fever AND diarrhea
- **Medium**: cases ≥ 5 AND symptoms include fever OR cough
- **Low**: All other cases

Risk level is stored on the observation and shown immediately to the volunteer after submission.

---

## 6. Dashboards
Role-aware dashboards accessible to all authenticated users:

### Risk Overview Cards
- Total reports, high-risk reports, active alerts (outbreak_alert = true)

### Static Africa Heatmap
- SVG map of Africa with regions colored by risk level
- Visual legend for Low / Medium / High

### Trend Charts
- **Line chart**: Cases reported over time
- **Bar chart**: Symptom frequency distribution

### Observations Table
- Sortable/filterable table showing location, symptoms, risk level, predicted diseases, confidence scores, and status
- Filters by date range, risk level, country/state

---

## 7. Doctor Validation Portal
Accessible only to users with the "doctor" role:
- List of flagged/high-risk observations awaiting validation
- Detail view for each observation with all submitted data and risk assessment
- Validation form: confirm, correct, or mark as false positive
- Optional fields for corrected disease name and doctor notes
- Validation status updates the observation record

---

## 8. Alerts & Notifications
- **In-app notification system**: Triggered when an observation has rule_risk_level = "High" or outbreak_alert = true
- **Dashboard highlights**: High-risk observations are visually emphasized with red badges/borders
- **Notification bell** in the app header showing unread alert count for doctors and admins
- Email alerts are prepared architecturally (can be enabled later via edge function)

---

## 9. Admin Capabilities
Admin users get full access to:
- All observations regardless of status
- User management overview (list of volunteers and doctors)
- Ability to assign/change user roles
- System-wide dashboard with aggregate statistics

---

## 10. AI-Ready Architecture
Fields and endpoints prepared for Phase 2 AI integration:
- `ai_risk_level`, `predicted_diseases`, `confidence_scores`, and `outbreak_alert` columns exist in the observations table
- Placeholder for AI API call (POST with location, symptoms, cases, environment)
- Dashboard components already display AI fields when populated
- No AI API calls made in Phase 1 — fields remain null until integration

