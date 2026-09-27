# 🧪 PERFORMAX (EPMS) — Test Cases Specification: Test Manager / QA Lead Persona

**Document ID:** `TC-SPEC-MGR-001`  
**Target Persona:** Test Manager / QA Lead / Engineering Manager (`elena.qa@company.com`, `marcus.tech@company.com`)  
**Target System:** PERFORMAX — Enterprise Performance Management System (EPMS)  
**Version:** `2.4.0`  
**Status:** Approved & Active  
**Author:** QA Engineering Team  

---

## 📋 Table of Contents
1. [Overview & Scope](#1-overview--scope)
2. [Test Environment & Prerequisites](#2-test-environment--prerequisites)
3. [Test Execution Matrix Summary](#3-test-execution-matrix-summary)
4. [Detailed Test Cases](#4-detailed-test-cases)
   - [Suite 1: Authentication, Authorization & RBAC](#suite-1-authentication-authorization--rbac)
   - [Suite 2: Manager Dashboard & Team Telemetry](#suite-2-manager-dashboard--team-telemetry)
   - [Suite 3: Goal & KPI Management](#suite-3-goal--kpi-management)
   - [Suite 4: Evidence & Deliverables Review](#suite-4-evidence--deliverables-review)
   - [Suite 5: Performance Appraisal & Evaluation](#suite-5-performance-appraisal--evaluation)
   - [Suite 6: Continuous Feedback & 1-on-1 Sync Meetings](#suite-6-continuous-feedback--1-on-1-sync-meetings)
   - [Suite 7: Performance Improvement Plans (PIP) & IDP](#suite-7-performance-improvement-plans-pip--idp)
   - [Suite 8: Negative Testing, Security & Edge Cases](#suite-8-negative-testing-security--edge-cases)
5. [Pass / Fail Acceptance Criteria](#5-pass--fail-acceptance-criteria)

---

## 1. Overview & Scope

### 1.1 Objective
This document defines the formal test cases to validate the functional, non-functional, security, and data integrity capabilities of the **Test Manager / QA Lead** persona within PERFORMAX.

### 1.2 Persona Definition
* **Role Identifier:** `MANAGER`
* **Assigned Personas:**
  * **Elena Vance:** QA Lead / Test Manager (`elena.qa@company.com` / `ElenaPassword123!`)
  * **Marcus Vance:** Tech Manager (`marcus.tech@company.com` / `MarcusPassword123!`)
* **Core Responsibilities:**
  * Supervising assigned QA / Engineering interns across their team.
  * Setting measurable, weighted KRAs, KPIs, and deliverables.
  * Reviewing and approving technical evidence (bug reports, test plans, automation PRs).
  * Scoring performance appraisals (1–5 scale), calculating weighted scores, and uploading digital signatures.
  * Conducting 1-on-1 syncs, continuous coaching, and PIP recovery workflows.

### 1.3 Out of Scope
* 360 Multi-Rater Peer Review features (Module decommissioned).
* Super Admin organization settings (Job Levels, Salary brackets, System audit purge).

---

## 2. Test Environment & Prerequisites

| Component | Specification |
|---|---|
| **Frontend URL** | `http://localhost:5173/` (Vite + React 19 + TypeScript) |
| **Backend API URL** | `http://127.0.0.1:8000/api/` (Django REST Framework) |
| **Database** | SQLite / PostgreSQL (`db.sqlite3` seeded with 80 Dailoqa Interns & Hierarchy) |
| **Test Manager Credentials** | `elena.qa@company.com` or `marcus.tech@company.com` |
| **Direct Reports Sample** | Interns in QA / Engineering teams (`alex.dev@company.com`, `liam.qa@company.com`, `tanvi.kad@dailoqa.com`) |

---

## 3. Test Execution Matrix Summary

| Suite ID | Functional Area | Total Tests | Priority (P1/P2/P3) |
|---|---|:---:|:---:|
| `TC-MGR-AUTH` | Authentication, RBAC & Data Isolation | 5 | 4 / 1 / 0 |
| `TC-MGR-DASH` | Manager Dashboard & Team Telemetry | 5 | 3 / 2 / 0 |
| `TC-MGR-KPI` | Goal & KPI Management | 6 | 4 / 2 / 0 |
| `TC-MGR-EVD` | Evidence & Deliverable Verification | 5 | 4 / 1 / 0 |
| `TC-MGR-APP` | Performance Appraisal & Evaluation | 7 | 5 / 2 / 0 |
| `TC-MGR-CFM` | Continuous Feedback & 1-on-1 Syncs | 4 | 2 / 2 / 0 |
| `TC-MGR-PIP` | PIP Recovery & IDP Growth Plans | 4 | 2 / 2 / 0 |
| `TC-MGR-SEC` | Negative Testing & Security Guards | 5 | 4 / 1 / 0 |
| **TOTAL** | | **41** | **28 / 13 / 0** |

---

## 4. Detailed Test Cases

### Suite 1: Authentication, Authorization & RBAC

#### `TC-MGR-AUTH-001`: Test Manager Successful Password Login
* **Description:** Verify that a Test Manager can successfully sign in using valid corporate credentials.
* **Pre-conditions:** Account `elena.qa@company.com` is active in `accounts_user` with role `MANAGER`.
* **Test Steps:**
  1. Open `http://localhost:5173/`.
  2. Select **"Password Sign-In"** tab.
  3. Enter email `elena.qa@company.com` and password `ElenaPassword123!`.
  4. Click **"Sign In to PMS"**.
* **Expected Result:**
  * HTTP `200 OK` on `/api/auth/login/`.
  * JWT access and refresh tokens returned and stored in Redux store.
  * Browser redirected to `/dashboard`.
  * Header shows user profile badge: **"Elena Vance (MANAGER)"**.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-AUTH-002`: Corporate Domain Restriction Enforcement
* **Description:** Verify that non-corporate emails cannot access the login system.
* **Pre-conditions:** Web application open at login screen.
* **Test Steps:**
  1. Enter `testmanager@gmail.com` or `elena@yahoo.com`.
  2. Enter any password and submit.
* **Expected Result:**
  * Immediate rejection on frontend with error: *"Access restricted: Only official @dailoqa.com corporate email addresses are authorized to sign in."*
  * Request blocked from reaching the server or rejected with `403 Forbidden` on backend.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-AUTH-003`: JWT Claims & Role Verification
* **Description:** Verify that JWT token issued to Test Manager contains correct role claims and user ID.
* **Pre-conditions:** Logged in as Test Manager.
* **Test Steps:**
  1. Inspect network payload of `/api/auth/login/` or `/api/auth/me/`.
  2. Decode the JWT Access Token using standard base64 decoder.
* **Expected Result:**
  * Payload contains `"role": "MANAGER"`.
  * Claims include `"permissions": ["ROLE_MANAGER", "ALL"]`.
  * User profile details (employee code, designation "QA Manager") correctly populated.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-AUTH-004`: Row-Level Security — Direct Reports Isolation
* **Description:** Verify that Test Manager can ONLY view data belonging to their assigned direct reports.
* **Pre-conditions:** Test Manager Elena manages QA Interns (`liam.qa@company.com`). Marcus manages Engineering Interns (`alex.dev@company.com`).
* **Test Steps:**
  1. Log in as Elena Vance (`elena.qa@company.com`).
  2. Query `/api/manager/team-goals/` and `/api/manager/dashboard/`.
* **Expected Result:**
  * Only Liam's goals and metrics are returned.
  * Alex's goals and evidence records are completely absent from the response list.
  * Database query uses `EmployeeProfile.objects.filter(manager=request.user)`.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-AUTH-005`: Privilege Escalation Guard (Accessing Admin Endpoints)
* **Description:** Verify that Test Manager cannot access Super Admin administration or HR configuration endpoints.
* **Pre-conditions:** Logged in as Test Manager (`role: MANAGER`).
* **Test Steps:**
  1. In the browser URL bar, attempt navigating directly to `/admin/audit` or `/admin/roles`.
  2. Send a `POST` request to `/api/organization/departments/` with Elena's Bearer token.
* **Expected Result:**
  * Frontend navigation redirects to `/dashboard` or shows 403 Access Denied.
  * Backend API responds with HTTP `403 Forbidden`.
* **Priority:** `P1 (Critical)`

---

### Suite 2: Manager Dashboard & Team Telemetry

#### `TC-MGR-DASH-001`: Direct Reports Team Size Metric
* **Description:** Verify the team size metric accurately calculates total active direct reports.
* **Pre-conditions:** Logged in as Test Manager with 3 direct reports.
* **Test Steps:**
  1. Navigate to `/dashboard`.
  2. Inspect the **"Team Members"** metric card.
* **Expected Result:**
  * Metric displays exact count `3`.
  * Matches `SELECT COUNT(*) FROM employees_employeeprofile WHERE manager_id = <Elena_ID>`.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-DASH-002`: Pending Evidence Reviews Counter
* **Description:** Verify the dashboard highlights submitted test deliverables awaiting manager review.
* **Pre-conditions:** Intern submits 2 new evidence items with status `PENDING`.
* **Test Steps:**
  1. Open Manager Dashboard.
  2. Check **"Pending Reviews"** badge and list.
* **Expected Result:**
  * Counter displays `2`.
  * Urgent review table shows intern name, deliverable title, and submission timestamp.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-DASH-003`: Pending Appraisals Counter
* **Description:** Verify that completed self-assessments needing manager rating appear on the dashboard.
* **Pre-conditions:** Intern completes self-assessment (`status='SUBMITTED'`).
* **Test Steps:**
  1. Check **"Pending Appraisals"** widget on Manager Dashboard.
* **Expected Result:**
  * Widget shows appraisal cycle name and intern name with action button **"Evaluate Now"**.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-DASH-004`: Team Average Performance Score Calculation
* **Description:** Verify average performance score calculation of direct reports.
* **Pre-conditions:** Two direct reports have finalized appraisal scores of `8.0` and `9.0`.
* **Test Steps:**
  1. Inspect **"Team Average Score"** on dashboard.
* **Expected Result:**
  * Displays `8.5 / 10.0` (or normalized percentage $85.0\%$).
* **Priority:** `P2 (High)`

---

#### `TC-MGR-DASH-005`: Quick Navigation from Dashboard Widgets
* **Description:** Verify clicking on dashboard cards redirects to respective manager management pages.
* **Test Steps:**
  1. Click **"Review Evidence"** button on pending review card $\rightarrow$ routes to `/api/manager/evidence-reviews/` view.
  2. Click **"View Team Goals"** $\rightarrow$ routes to `/kpi/team`.
* **Expected Result:**
  * Smooth router transition without page reload or broken routes.
* **Priority:** `P2 (High)`

---

### Suite 3: Goal & KPI Management

#### `TC-MGR-KPI-001`: Assign New Goal to a Direct Report
* **Description:** Test Manager creates a technical goal for a QA intern for the current cycle.
* **Pre-conditions:** Active appraisal cycle exists.
* **Test Steps:**
  1. Navigate to **Goal Management** (`/kpi/manage`).
  2. Select intern **Liam Vance (QA Intern)**.
  3. Enter Goal Title: *"Design & Automate End-to-End Regression Test Suite"*.
  4. Assign Weightage: `40%`.
  5. Set Priority: `HIGH`.
  6. Click **Save Goal**.
* **Expected Result:**
  * HTTP `201 Created` on `/api/goals/`.
  * Goal appears on intern's roster with `0%` initial progress.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-KPI-002`: Attach Measurable KPIs to a Goal
* **Description:** Attach quantifiable KPIs to an existing goal.
* **Test Steps:**
  1. Under the automated test goal, click **"Add KPI"**.
  2. KPI 1: *"Test Automation Coverage"* | Target: `85%` | Measurement: `PERCENTAGE`.
  3. KPI 2: *"Critical Defect Detection"* | Target: `20 Bugs` | Measurement: `NUMERIC`.
  4. Submit KPI definitions.
* **Expected Result:**
  * KPIs successfully linked to parent `Goal` in database.
  * Real-time progress updates dynamically as intern reports achievements.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-KPI-003`: 100% Weightage Validation (Invariant Check)
* **Description:** Verify that total assigned goal weights for an intern must equal exactly 100%.
* **Test Steps:**
  1. Assign Goal 1 with `50%`.
  2. Assign Goal 2 with `50%`.
  3. Attempt to save the goal configuration.
* **Expected Result:**
  * Total weight indicator shows `100%` in green.
  * Form saves successfully.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-KPI-004`: Rejection of Invalid Total Weightage ($>100\%$ or $<100\%$)
* **Description:** Verify error handling when goal weights do not equal 100%.
* **Test Steps:**
  1. Assign Goal 1 with `40%` and Goal 2 with `30%` (Total = `70%`).
  2. Click **"Finalize Goal Assignment"**.
* **Expected Result:**
  * System displays validation error: *"Total goal weightage must sum to exactly 100%. Current sum: 70%."*
  * Save action is blocked.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-KPI-005`: Goal Editing & Re-weighting Audit
* **Description:** Verify updating an existing goal weightage logs an audit record.
* **Test Steps:**
  1. Change Goal 1 weight from `50%` to `60%`, Goal 2 from `50%` to `40%`.
  2. Save changes.
* **Expected Result:**
  * Database updates successfully.
  * An entry is written to `audit_auditlog` recording `action='GOAL_WEIGHT_UPDATE'`, `user='elena.qa@company.com'`.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-KPI-006`: Real-time Team Goal Progress Overview (`/kpi/team`)
* **Description:** Verify the team goal progress table reflects up-to-date milestone completions.
* **Test Steps:**
  1. Navigate to `/kpi/team`.
  2. Filter by Team **"QA & DevOps"**.
* **Expected Result:**
  * Table lists all team members, active goal count, aggregated progress percentage bar, and status pills (`IN_PROGRESS`, `COMPLETED`, `AT_RISK`).
* **Priority:** `P2 (High)`

---

### Suite 4: Evidence & Deliverables Review

#### `TC-MGR-EVD-001`: Retrieve Pending Evidence Queue
* **Description:** Verify Test Manager can view all submitted PRs and deliverables waiting for approval.
* **Test Steps:**
  1. Navigate to Evidence Reviews page (`/api/manager/evidence-reviews/`).
* **Expected Result:**
  * HTTP `200 OK`.
  * Returns list of evidence submitted by direct reports with `reviewStatus='PENDING'`.
  * Shows deliverable title, linked goal, artifact URL (GitHub PR / TestRail link), and submission notes.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-EVD-002`: Approve Evidence Submission with Remarks
* **Description:** Test Manager reviews and approves an intern's automation suite pull request.
* **Pre-conditions:** Evidence submission `#EVD-101` in `PENDING` state.
* **Test Steps:**
  1. Open evidence review modal for `#EVD-101`.
  2. Inspect the linked test report and PR URL.
  3. Select decision: **"Approve"**.
  4. Enter remarks: *"Comprehensive test cases with 92% code coverage. Excellent work."*
  5. Click **"Submit Decision"**.
* **Expected Result:**
  * `POST /api/manager/evidence-reviews/EVD-101/decision/` returns `200 OK`.
  * `review_status` updated to `APPROVED`.
  * `reviewed_by` set to Test Manager's user ID.
  * `reviewer_remarks` saved and visible on intern's evidence timeline.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-EVD-003`: Request Changes / Reject Evidence with Mandatory Remarks
* **Description:** Test Manager requests revisions on an incomplete test deliverable.
* **Test Steps:**
  1. Select decision: **"Request Revisions"** (or `REJECTED`).
  2. Leave remarks field empty and attempt submit.
  3. Enter required remarks: *"Please add negative boundary test cases for the payment gateway module."*
  4. Submit.
* **Expected Result:**
  * Step 2 blocked: Remarks are mandatory when rejecting or requesting changes.
  * Step 4 succeeds: `review_status` set to `REJECTED` / `NEEDS_REVISION`.
  * Intern receives notification to resubmit.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-EVD-004`: Non-Existent Deliverable ID Error Handling
* **Description:** Verify API responds with clean 404 when querying an invalid evidence UUID.
* **Test Steps:**
  1. Send `POST` to `/api/manager/evidence-reviews/00000000-0000-0000-0000-000000000000/decision/`.
* **Expected Result:**
  * HTTP `404 Not Found`.
  * Response body: `{"code": 404, "message": "Evidence not found"}`.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-EVD-005`: Unauthorized Cross-Team Evidence Approval
* **Description:** Verify Test Manager cannot approve deliverables belonging to interns outside their reporting hierarchy.
* **Pre-conditions:** Evidence submission `#EVD-202` submitted by engineering intern managed by Marcus.
* **Test Steps:**
  1. Elena sends approval request for `#EVD-202` using her JWT token.
* **Expected Result:**
  * HTTP `403 Forbidden` or `404 Not Found`.
  * Status of `#EVD-202` remains unchanged in the database.
* **Priority:** `P1 (Critical)`

---

### Suite 5: Performance Appraisal & Evaluation

#### `TC-MGR-APP-001`: Access Completed Self-Assessment
* **Description:** Verify Test Manager can view direct report's completed self-ratings and comments.
* **Pre-conditions:** Appraisal cycle is in Manager Evaluation phase; intern has submitted self-assessment.
* **Test Steps:**
  1. Navigate to `/appraisal`.
  2. Open appraisal file for **Liam Vance**.
* **Expected Result:**
  * Intern's self-score ($1–5$), achievements summary, and development requests are rendered in read-only format.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-APP-002`: Manager Evaluation Scoring (1–5 Scale)
* **Description:** Test Manager scores the intern across key performance criteria.
* **Test Steps:**
  1. Open Manager Evaluation tab.
  2. Score criteria:
     * *Technical Competence & QA Quality:* `4.5 / 5.0`
     * *Execution & Deadlines:* `4.0 / 5.0`
     * *Collaboration & Communication:* `4.5 / 5.0`
  3. Enter Manager Qualitative Summary.
* **Expected Result:**
  * Scores entered validate within boundary range ($1.0 \le \text{Score} \le 5.0$).
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-APP-003`: Overall Calculated Score Verification
* **Description:** Verify that the system mathematical engine accurately calculates the combined performance total.
* **Formula:**
  $$\text{Total Score} = (\text{KPI Score} \times 0.40) + (\text{Manager Score} \times 0.40) + (\text{Self Score} \times 0.20)$$
* **Test Data:**
  * KPI Score: `90.0%`
  * Manager Score: `80.0%`
  * Self Score: `85.0%`
* **Expected Result:**
  $$\text{Total} = (90 \times 0.40) + (80 \times 0.40) + (85 \times 0.20) = 36.0 + 32.0 + 17.0 = 85.0\%$$
  * Table renders Category Breakdown with accurate raw score, weight, and weighted points.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-APP-004`: State Transition from DRAFT to SUBMITTED
* **Description:** Verify appraisal status changes upon manager final submission.
* **Test Steps:**
  1. Click **"Submit Manager Evaluation to HR"**.
  2. Confirm confirmation dialog.
* **Expected Result:**
  * Appraisal record status updates to `SUBMITTED` / `UNDER_REVIEW`.
  * Timestamp `manager_submitted_at` recorded.
  * Intern receives notification that manager evaluation has been completed.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-APP-005`: Manager Score Lock-In (Immutable After Submission)
* **Description:** Verify that once submitted to HR, manager cannot edit scores or comments.
* **Test Steps:**
  1. Re-open submitted appraisal record.
  2. Attempt to modify criteria sliders or save button.
* **Expected Result:**
  * Input fields are disabled/locked.
  * Save button is hidden or disabled.
  * Direct API `PUT`/`PATCH` returns HTTP `400 Bad Request` (*"Appraisal already submitted and locked for review"*).
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-APP-006`: Digital Signature Capture
* **Description:** Test Manager signs the evaluation form using the digital signature canvas.
* **Test Steps:**
  1. In the sign-off panel, draw signature on the HTML5 signature canvas.
  2. Click **"Confirm & Sign"**.
* **Expected Result:**
  * Base64 / PNG signature uploaded via `useUploadManagerSignatureMutation`.
  * Verified signature badge appears with timestamp and green verified tick.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-APP-007`: Performance Summary PDF Export
* **Description:** Test Manager exports completed performance appraisal summary as a branded PDF report.
* **Test Steps:**
  1. Click **"Download Performance Summary (PDF)"**.
* **Expected Result:**
  * Browser downloads file `Performance_Summary_Liam_Vance.pdf`.
  * PDF contains company logo, employee details, scoring breakdown table, manager remarks, and verified signatures.
* **Priority:** `P2 (High)`

---

### Suite 6: Continuous Feedback & 1-on-1 Sync Meetings

#### `TC-MGR-CFM-001`: Schedule a 1-on-1 Sync Meeting
* **Description:** Test Manager schedules a bi-weekly sync meeting with a direct report.
* **Test Steps:**
  1. Navigate to **1-on-1 Meetings** (`/meetings`).
  2. Click **"Schedule New Meeting"**.
  3. Select intern, set date/time, and add agenda: *"Review automation sprint deliverables and blocker resolution"*.
  4. Submit.
* **Expected Result:**
  * HTTP `201 Created` on `/api/meetings/`.
  * Meeting appears on manager and intern's sync calendar.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-CFM-002`: Document Meeting Minutes & Action Items
* **Description:** Test Manager logs notes and assignable action items during the meeting.
* **Test Steps:**
  1. Open scheduled meeting.
  2. Enter discussion notes: *"Reviewed test scripts. Agreed to prioritize API regression tests."*
  3. Add Action Item: *"Deliver mock authentication tests by Friday"* (Assigned to Intern).
  4. Mark meeting as **Conducted**.
* **Expected Result:**
  * Meeting status updates to `CONDUCTED`.
  * Action item appears in intern's pending checklist.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-CFM-003`: Send Instant Praise / Constructive Note
* **Description:** Test Manager sends continuous feedback to direct report.
* **Test Steps:**
  1. Navigate to **Continuous Feedback** (`/continuous-feedback`).
  2. Click **"Give Feedback"**.
  3. Select Type: `PRAISE`.
  4. Enter message: *"Outstanding effort in identifying critical race condition in Sprint 4."*
  5. Select Visibility: `PUBLIC`.
  6. Submit.
* **Expected Result:**
  * Feedback card appears in company recognition stream and on intern's profile.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-CFM-004`: Private Manager-Only Coaching Note
* **Description:** Test Manager creates private documentation notes visible only to manager and HR.
* **Test Steps:**
  1. Create feedback with visibility set to `PRIVATE` / `MANAGER_ONLY`.
* **Expected Result:**
  * Visible to Test Manager and HR Partner.
  * Hidden from intern's view.
* **Priority:** `P2 (High)`

---

### Suite 7: Performance Improvement Plans (PIP) & IDP

#### `TC-MGR-PIP-001`: Initiate a PIP for Underperforming Intern
* **Description:** Test Manager initiates a Performance Improvement Plan when an intern scores below the performance baseline ($<50\%$).
* **Test Steps:**
  1. Navigate to `/pip`.
  2. Click **"Initiate PIP"**.
  3. Select employee, specify duration: `30 Days`.
  4. Enter Root Cause: *"Gaps in test automation scripting and missed sprint delivery dates"*.
  5. Set Target Check-in Dates (Day 15, Day 30).
  6. Submit.
* **Expected Result:**
  * PIP created with status `ACTIVE`.
  * HR Partner notified for governance review.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-PIP-002`: Log PIP Milestone Check-in Progress
* **Description:** Test Manager documents mid-point progress during Day 15 review.
* **Test Steps:**
  1. Open active PIP `#PIP-001`.
  2. Click **"Add Check-in Log"**.
  3. Log feedback on test automation progress and attendance consistency.
* **Expected Result:**
  * Check-in timeline reflects the recorded evaluation.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-PIP-003`: Finalize PIP Outcome (Resolved vs Escalated)
* **Description:** Test Manager concludes PIP after the target period.
* **Test Steps:**
  1. Click **"Conclude PIP"**.
  2. Select Outcome: `SUCCESSFULLY_COMPLETED` (or `TERMINATION_RECOMMENDED`).
  3. Enter final rationale and sign off.
* **Expected Result:**
  * Status updates to `COMPLETED` / `RESOLVED`.
  * Appraisal history records the PIP outcome for compliance.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-PIP-004`: Create Individual Development Plan (IDP)
* **Description:** Test Manager sets up a professional growth plan for high-potential interns.
* **Test Steps:**
  1. Navigate to `/idp`.
  2. Add Skill Target: *"Performance Testing with JMeter & K6"*.
  3. Attach Recommended Course: *"Enterprise Load Testing Masterclass"*.
  4. Set target completion date.
* **Expected Result:**
  * IDP goals tracked alongside core appraisal goals.
* **Priority:** `P2 (High)`

---

### Suite 8: Negative Testing, Security & Edge Cases

#### `TC-MGR-SEC-001`: Evaluation Submission After Cycle Deadline (Temporal Boundary)
* **Description:** Verify manager cannot submit ratings if the appraisal cycle phase is closed.
* **Pre-conditions:** Appraisal cycle `status='CLOSED'`.
* **Test Steps:**
  1. Send `POST` to `/api/performance/appraisals/{id}/calculate-score/` or submit ratings.
* **Expected Result:**
  * HTTP `400 Bad Request`.
  * Message: *"Appraisal cycle is closed. Evaluations cannot be submitted."*
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-SEC-002`: Cross-Site Scripting (XSS) Prevention in Remarks
* **Description:** Verify that malicious scripts in reviewer remarks or goal titles are sanitized.
* **Test Steps:**
  1. In evidence reviewer remarks, enter `<script>alert('XSS-VULN')</script>`.
  2. Save and reload the evidence review page.
* **Expected Result:**
  * Script is rendered as sanitized escaped plain text.
  * No JavaScript popup executes.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-SEC-003`: Automatic Token Refresh Interceptor
* **Description:** Verify frontend automatically refreshes expired access token using refresh token.
* **Test Steps:**
  1. Allow JWT access token to expire (1 hour).
  2. Perform an action (e.g. click "Approve Deliverable").
* **Expected Result:**
  * Axios / RTK Query interceptor detects `401 Unauthorized`.
  * Calls `/api/auth/token/refresh/` using stored refresh token.
  * Retries the original request seamlessly without logging user out.
* **Priority:** `P1 (Critical)`

---

#### `TC-MGR-SEC-004`: Intern Manager Reassignment Consistency
* **Description:** Verify data consistency when an intern is reassigned to another manager mid-cycle.
* **Test Steps:**
  1. HR reassigns intern Liam from Elena to Marcus in `EmployeeProfile`.
  2. Elena refreshes her dashboard.
  3. Marcus opens his dashboard.
* **Expected Result:**
  * Liam disappears from Elena's active review queue.
  * Liam appears under Marcus's team goals and reviews queue.
  * All previous evidence remarks and timestamps remain intact.
* **Priority:** `P2 (High)`

---

#### `TC-MGR-SEC-005`: Absence of 360 Review Modules
* **Description:** Verify that all decommissioned 360 review routes return 404 or redirect.
* **Test Steps:**
  1. Navigate to `/360-feedback/pending`, `/360-feedback/admin`, or `/360-feedback/calibration`.
* **Expected Result:**
  * Route renders 404 Not Found or redirects safely to `/dashboard`.
  * No uncaught JavaScript runtime errors in console.
* **Priority:** `P1 (Critical)`

---

## 5. Pass / Fail Acceptance Criteria

A test cycle for the Test Manager persona is considered **PASSED** if:
1. **Critical Path (P1):** $100\%$ Pass rate across all 28 Critical (P1) test cases.
2. **High Priority (P2):** $\ge 95\%$ Pass rate across P2 test cases with no blocking defects.
3. **Data Isolation:** Zero instances of cross-team data leaks or unauthorized privilege escalation.
4. **Scoring Invariant:** Zero mathematical drift between individual category weights and the final calculated performance score.
5. **No Regressions:** Clean execution of backend unit tests (`python manage.py test apps`) and clean frontend build (`npm run build`).

---
*PERFORMAX Quality Engineering Documentation &bull; Confidential & Proprietary &bull; Dailoqa Enterprise*
