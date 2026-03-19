# Smart PRD

## 1. Product Objective

Build a workforce operations platform that unifies attendance, scheduling, requests, task execution, operational communication, and payroll input in one ecosystem for web and mobile.

## 2. Primary Users

- employee
- manager
- hr admin
- operations admin
- payroll admin
- tenant owner

## 3. Success Criteria

- employee can complete check-in under 10 seconds in normal conditions
- manager sees attendance exceptions in under 3 seconds after event confirmation
- schedule changes propagate to impacted users immediately
- requests can be submitted and approved end-to-end without manual side channels
- heavy reports are generated asynchronously without blocking main UX

## 4. Product Requirements by Module

### 4.1 Authentication and Onboarding

Functional requirements:

- support email/password and phone/OTP login
- support invite-based employee onboarding
- enforce tenant-aware login
- allow password reset and session revocation
- bind a primary device on first successful mobile login
- support rebind flow with approval or recovery policy

UX requirements:

- onboarding in clear steps
- progress indicator for enrollment
- minimal friction on repeat login
- clear explanation when access is blocked

Non-functional requirements:

- secure token storage
- refresh token rotation
- brute-force protection
- audit log for login, logout, password reset, rebind

### 4.2 Attendance

Functional requirements:

- employee can check in, check out, start break, end break
- backend validates geofence, shift window, device status, policy, and selfie verification requirements
- system records late arrival, early leave, overtime, night hours
- manager sees realtime updates on attendance board
- employee can request correction for attendance records
- system supports unscheduled attendance only by policy rule

UX requirements:

- one primary CTA for current allowed action
- attendance status visible on home screen immediately
- failure reasons stated in plain language
- user sees location and verification progress before submit

Non-functional requirements:

- server-side timestamp authority
- event-driven cache invalidation
- full auditability
- resilient under poor mobile signal with retry states

### 4.3 Biometric Verification

Functional requirements:

- support selfie enrollment flow
- support liveness verification flow
- support face match against enrolled reference
- support policy per tenant / location / role on when verification is required
- allow fallback manual review path on verification failures

UX requirements:

- clear camera guidance
- obvious lighting and face position instructions
- progress feedback during verification
- actionable failure messages

Non-functional requirements:

- encrypted storage of biometric references
- retention policy support
- consent logging

### 4.4 Organization and Employee Records

Functional requirements:

- manage locations, departments, positions, teams
- manage employee card with personal, organizational, legal, payroll, and operational data
- support manager hierarchy
- support active/inactive/terminated employee state
- support document upload and expiry tracking

UX requirements:

- employee card split into tabs with stable navigation
- managers see summary first, details second
- sensitive data visually separated

### 4.5 Scheduling

Functional requirements:

- create shift templates
- assign shifts individually or in bulk
- support repeating patterns and rotating schedules
- support overnight shifts and split shifts
- support open shifts and self-claim rules
- support shift change history and approval workflows

UX requirements:

- calendar and table views
- bulk actions must be safe and previewed
- change history must be easy to inspect

Non-functional requirements:

- version schedules
- preserve schedule snapshots for payroll periods

### 4.6 Requests and Approvals

Functional requirements:

- configure request types dynamically
- support attachments, custom fields, SLA, and routing rules
- support sequential and parallel approval chains
- support comments and status timeline
- notify all relevant participants on state change

UX requirements:

- request creation in short, understandable forms
- manager sees pending items sorted by urgency
- status and next approver always visible

### 4.7 Tasks and Checklists

Functional requirements:

- create templates with typed fields and scoring
- assign tasks by employee, role, department, location, or schedule condition
- support recurring tasks
- require live camera photo when configured
- support manager approval and rejection with comment
- produce PDF report with answers, photos, time, and geodata

UX requirements:

- checklist completion should be step-based on mobile
- overdue and critical tasks must be visually prioritized
- photo requirement must be explicit before submission

### 4.8 Communication

Functional requirements:

- publish announcements with targeting rules
- upload documents requiring acknowledgment
- support chat for operational communication
- support polls and optional anonymous responses

UX requirements:

- unread counts visible globally
- announcements prioritized over normal chat noise
- acknowledgment tasks clearly separated from messages

### 4.9 Payroll Input

Functional requirements:

- compute payable time from schedule, attendance, leave, and rule set
- support overtime, night hours, penalties, weekend and holiday rules
- support manual adjustments with reasons
- generate employee slips and admin exports

UX requirements:

- show explanation of calculations
- separate raw attendance from payroll adjustments
- highlight anomalies before payroll finalization

### 4.10 Reporting and Analytics

Functional requirements:

- attendance reports
- lateness / absence reports
- schedule adherence reports
- task and checklist reports
- payroll input reports
- configurable filters and saved templates
- asynchronous generation for large exports

UX requirements:

- report builder starts from templates
- filters grouped logically
- export progress visible

## 5. Core User Flows

### Employee Daily Flow

1. Open app.
2. View current status card.
3. Tap available action.
4. Complete location and selfie requirements.
5. Confirm success.
6. View tasks and announcements.
7. Submit requests if needed.

### Manager Daily Flow

1. Open dashboard.
2. Review live attendance exceptions.
3. Open pending approvals.
4. Review overdue tasks and failed checklists.
5. Adjust schedule or staffing if needed.
6. Export or inspect team report.

## 6. Constraints

- mobile UX must remain usable in stressful work environments
- employee actions must be possible with one hand and minimal text entry
- manager dashboards must handle hundreds of employees without clutter
- all critical actions require audit history

## 7. Open Product Decisions

- first launch countries and legal jurisdictions
- supported payroll complexity at MVP
- selected biometric vendor or in-house verification stack
- whether chat is in MVP or phase 1.5
