# Smart MVP Roadmap

## 1. Delivery Strategy

Build as a modular monolith with strict module boundaries. Launch a strong MVP instead of a wide but weak first version.

## 2. MVP Goal

Launch a production-capable version that solves the core daily operating loop:

- employee authentication and onboarding
- device binding
- attendance with geolocation and selfie verification
- manager live attendance dashboard
- employee directory and cards
- schedule templates and assignments
- request engine with approvals
- checklist tasks with evidence
- reporting exports
- announcements

## 3. Workstreams

- product and UX
- backend platform
- web admin
- mobile app
- infrastructure and DevOps
- QA and release operations

## 4. Sprint Breakdown

### Sprint 0. Foundation

Goals:

- monorepo setup
- CI/CD baseline
- Docker Compose local stack
- PostgreSQL + Redis + object storage local environment
- auth module skeleton
- design system baseline for web and mobile

Deliverables:

- repo structure
- lint / format / typecheck
- shared config packages
- environment strategy

### Sprint 1. Identity and Organization

Goals:

- tenant model
- users and roles
- employee model
- locations, departments, positions
- invite flow and login
- device registration baseline

Deliverables:

- auth API
- employee CRUD
- organization admin screens
- basic mobile login

### Sprint 2. Attendance Core

Goals:

- check-in / out API
- location validation
- primary device enforcement
- attendance state machine
- manager live board
- employee home status card

Deliverables:

- mobile attendance flow
- web attendance dashboard
- attendance event and session models
- notifications for absence and lateness

### Sprint 3. Biometric Verification

Goals:

- selfie enrollment
- liveness and match verification integration
- verification policy engine
- failure and manual review states

Deliverables:

- mobile camera flow
- biometric records
- verification result handling

### Sprint 4. Scheduling

Goals:

- shift templates
- shift assignment
- calendar and list views
- shift history log
- open shifts baseline

Deliverables:

- web scheduling module
- employee schedule view
- schedule-driven attendance validation

### Sprint 5. Requests and Approvals

Goals:

- dynamic request types
- request submission UI
- approval workflow engine
- pending approvals dashboard widgets

Deliverables:

- request APIs
- employee request center
- manager approval inbox

### Sprint 6. Tasks and Checklists

Goals:

- task templates
- checklist definitions
- evidence photo capture
- approval on completion
- checklist reporting

Deliverables:

- mobile task execution flow
- manager task board
- PDF report generation baseline

### Sprint 7. Reporting and Payroll Input

Goals:

- attendance exports
- payroll input calculations
- payroll slips
- report template system

Deliverables:

- report generation jobs
- payroll admin views
- employee slips view

### Sprint 8. Communication and Stabilization

Goals:

- announcements
- document acknowledgment
- notification center
- production hardening
- release prep

Deliverables:

- communication module MVP
- monitoring dashboards
- incident runbooks
- beta release candidate

## 5. MVP Acceptance Criteria

### Employee side

- can login
- can bind device
- can check in and out successfully
- can see schedule
- can submit leave request
- can complete assigned checklist with photo
- can receive announcement

### Manager side

- can see team attendance live
- can inspect employee card
- can assign shifts
- can approve requests
- can approve tasks
- can export attendance report

### Admin side

- can configure org structure
- can manage employee records
- can configure request types and task templates
- can generate payroll input export

## 6. Non-Functional Targets for MVP

- p95 employee home load under 2 seconds on warm cache
- p95 attendance action under 3 seconds excluding user selfie capture time
- report generation delegated to queue for heavy exports
- audit log for all privileged actions
- zero blocking page reload requirement for core dashboards

## 7. Post-MVP Priorities

- shift swaps and more advanced open shift logic
- operational chat
- deeper payroll rule coverage
- 1C and iiko integrations
- AI analytics and anomaly recommendations
