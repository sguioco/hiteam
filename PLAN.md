# Smart Plan

## 1. Vision

Smart is a workforce operations platform for attendance control, shift management, internal workflows, task execution, auditability, and payroll input generation.

The platform has three primary surfaces:

- Web admin panel for management and operations
- Mobile employee app for iOS and Android
- Backend platform that powers business logic, integrations, notifications, reporting, and realtime updates

The product target is not a simple clock-in system. It is an operations-grade system that combines HR operations, field compliance, scheduling, communication, and payroll input in one stack.

## 2. Product Goals

### Business Goals

- reduce attendance fraud
- reduce manual manager workload
- centralize operational communication
- create reliable, exportable records for payroll and audits
- provide fast visibility into attendance, staffing, and compliance issues

### User Goals

#### Employee

- mark arrival, departure, and breaks in a few taps
- prove physical presence and identity quickly
- see schedule, tasks, requests, and company updates in one place
- submit requests without going through offline manual processes

#### Manager

- see who is present, late, absent, or non-compliant in real time
- approve requests and task submissions quickly
- manage schedules at scale
- detect operational issues immediately

#### HR / Payroll / Operations

- maintain clean employee records
- generate reports and payroll inputs without manual reconciliation
- audit every correction and exception

## 3. Product Boundaries

### In Scope for Core Platform

- attendance and tabulation
- geolocation verification
- selfie verification and device binding
- schedules and shifts
- requests and approvals
- tasks, checklists, audits, and photo proof
- communication and announcements
- employee profile management
- exports and operational reports
- payroll input calculation
- integrations API

### Deferred or Phase 2

- AI assistant and automated anomaly analysis
- advanced workforce forecasting
- automated face recognition scoring improvements
- deep accounting integrations per country
- advanced BI warehouse and self-serve analytics builder

## 4. User Roles and Permission Model

### Global Roles

- `super_admin`: platform-wide control for support / root operations
- `tenant_owner`: company owner with full company access
- `hr_admin`: employee records, policies, documents, payroll inputs
- `operations_admin`: schedules, attendance, tasks, locations
- `manager`: team-level supervision and approvals
- `employee`: personal data, tasks, requests, attendance actions
- `auditor`: read-only access to logs, reports, compliance records

### Access Model

Access must be based on:

- tenant
- company / brand
- location
- department
- position
- reporting line
- feature permission
- data scope permission

Example:

- A manager can see only employees assigned to their locations or reporting structure.
- HR can see sensitive data fields not visible to line managers.
- Payroll can edit payroll adjustments but not schedule templates.

This requires RBAC plus scoped data filters, not only simple role flags.

## 5. Core Domains

The system should be split into bounded domains.

### 5.1 Identity and Access

- authentication
- sessions
- device binding
- biometric enrollment metadata
- role assignment
- permission checks

### 5.2 Organization Structure

- tenant
- company
- location
- department
- team
- position
- reporting line

### 5.3 Employee Records

- personal profile
- employment profile
- legal / document metadata
- emergency contacts
- compensation metadata

### 5.4 Attendance

- check-in / out
- breaks
- verification results
- attendance exceptions
- correction requests
- attendance summaries

### 5.5 Scheduling

- schedule templates
- shifts
- shift assignments
- open shifts
- shift swap requests
- schedule change history

### 5.6 Requests and Approvals

- request types
- request forms
- workflow rules
- approvals
- comments
- attachments

### 5.7 Tasks and Audits

- task templates
- checklist templates
- task instances
- answers
- evidence
- approvals
- scoring

### 5.8 Communication

- announcements
- chat
- documents
- read confirmations
- polls

### 5.9 Payroll Input

- calculation rules
- attendance-derived payable hours
- penalties
- overtime
- slips
- exports

### 5.10 Reporting and Integration

- exports
- API
- webhooks
- third-party sync jobs

## 6. Recommended Architecture

## 6.1 High-Level Stack

- Web admin: `Next.js` on `Vercel`
- Mobile app: `React Native` with `Expo` or bare workflow depending on biometric and camera constraints
- Backend API: `NestJS` or `FastAPI`
- Database: `PostgreSQL`
- Cache / realtime / queue primitives: `Redis`
- Object storage: `S3-compatible storage`
- Background jobs: `BullMQ` if NestJS, or `RQ/Celery/Arq` if Python
- Realtime delivery: WebSockets + push notifications
- Search: PostgreSQL full-text initially, dedicated search engine later if needed

## 6.2 Recommended Backend Choice

I recommend `NestJS + PostgreSQL + Redis` for this product.

Reason:

- large business domain with many modules and permissions
- strong fit for typed DTOs, modular architecture, queues, WebSockets, and GraphQL
- easier long-term maintainability for admin-heavy and realtime-heavy SaaS

`FastAPI` is also viable, but for this specific product the domain complexity, approvals, realtime flows, and modular separation favor `NestJS`.

## 6.3 API Strategy

Do not build the entire system on GraphQL only.

Recommended approach:

- `GraphQL` for admin dashboards, employee cards, filtered views, and complex read models
- `REST` for command-style actions and integration endpoints

Use `REST` for:

- check in / check out
- submit request
- approve request
- upload media
- enroll device
- enroll biometric profile
- webhook and third-party integrations

Use `GraphQL` for:

- dashboard widgets
- employee profile views
- schedule board views
- reports with filters
- audit feeds

This hybrid approach prevents mutation complexity, keeps integrations simple, and still gives fast flexible reads in the UI.

## 6.4 Monorepo Structure

Recommended repository layout:

```text
/apps
  /web-admin
  /mobile
  /api
/packages
  /ui
  /config
  /types
  /graphql
  /sdk
  /eslint-config
  /tsconfig
/infra
  /docker
  /railway
  /vercel
  /github
/docs
  /product
  /architecture
  /api
```

Tooling:

- `pnpm` workspaces
- `Turborepo`
- `TypeScript` across web, mobile, backend if NestJS is chosen

This reduces schema duplication and improves delivery speed.

## 7. Infrastructure You Mentioned and What Else Is Required

You already named:

- backend
- database
- Redis
- GraphQL
- Docker
- GitHub
- Railway
- Vercel

You also need:

- `PostgreSQL` as primary transactional database
- `S3-compatible object storage` for selfies, task photos, documents, exports
- `push notification provider` for iOS and Android
- `email provider` for invites, password reset, payroll slips, announcements
- `SMS or WhatsApp provider` only if phone-based onboarding is planned
- `background job queue`
- `WebSocket gateway`
- `CDN` for media delivery if media grows
- `observability stack` for logs, metrics, errors, traces
- `secrets management`
- `audit log storage`
- `virus / file safety scanning` for uploaded documents
- `backup and restore policy`
- `rate limiting and WAF`
- `legal/privacy storage policy` for biometric and geolocation data

Without these pieces the system will work as a prototype, not as a production platform.

## 8. Performance Strategy

Your idea about caching employee data in Redis is correct, but it must be structured.

### 8.1 What to Cache

- employee dashboard summary
- manager team dashboard summary
- employee card read model
- attendance day summary
- current shift status
- unread notification counters
- frequently used lookup tables
- precomputed report snapshots

### 8.2 What Not to Cache Blindly

- direct command writes
- payroll calculations during active edits without versioning
- security-sensitive device state without DB validation

### 8.3 Cache Strategy

- use Redis as a read-through and write-invalidation cache
- cache read models, not raw tables
- invalidate on domain events
- preload critical data after login
- optimistic UI updates for mobile and web where safe

Example:

1. Manager opens employee card.
2. API returns aggregated employee profile read model.
3. Read model comes from Redis if fresh.
4. If stale or missing, backend rebuilds from PostgreSQL and caches it.
5. Any attendance correction, schedule update, request approval, or task completion emits an event that invalidates affected keys.

This gives fast UX without corrupting source-of-truth logic.

## 9. Realtime Model

The product must feel instant. Redis alone does not make UX instant. You need event-driven updates.

### Realtime Channels

- live attendance status changes
- request approval status
- new chat messages
- new announcements
- task assignment changes
- checklist completion updates
- manager alerts for late / absent staff

### Delivery

- Web: WebSockets or Server-Sent Events
- Mobile foreground: WebSockets where stable
- Mobile background: push notifications

### Event Sources

- attendance action recorded
- request created / approved / rejected
- schedule changed
- task assigned / completed
- employee profile updated

Redis pub/sub can be used for event fanout between API instances.

## 10. Attendance and Verification Flow

This is the highest-risk area. The flow must be strict and auditable.

### 10.1 Required Inputs for Check-In

- authenticated session
- active bound device
- fresh device integrity state
- live location data
- active shift or allowed unscheduled check-in rule
- selfie verification if policy requires
- timestamp from server

### 10.2 Check-In Flow

1. Employee opens app.
2. App fetches current shift and allowed actions.
3. App requests fresh geolocation with highest possible precision.
4. App checks device-bound token.
5. If required, app opens in-app camera for selfie.
6. Selfie is sent for liveness and face match against enrolled profile.
7. Backend validates geofence, time window, shift assignment, device binding, and biometric policy.
8. Backend records attendance event.
9. Backend emits realtime event to manager dashboard.
10. Employee sees success, late flag, or exception state.

### 10.3 Anti-Fraud Controls

- one primary device per employee
- optional secondary device approval by manager
- geofence radius per location
- minimum location accuracy threshold
- server-side timestamping
- camera capture only, no gallery upload
- liveness detection for selfie verification
- jailbreak / root / emulator detection if feasible
- device fingerprinting
- anomaly detection flags for impossible travel or repeated failures

### 10.4 Biometric Approach

Important clarification:

- Native `Face ID` on iPhone cannot be used by your app as a direct identity database for employee attendance.
- On iOS and Android, you can use device biometric auth to unlock an action, but that only proves the current device owner unlocked the phone.
- For actual employee identity verification inside your product, you need your own selfie enrollment + face match flow with liveness detection.

Recommended model:

- First enrollment: guided selfie capture from multiple angles or a short motion-based liveness flow
- Store biometric templates or third-party verification references, not raw loose images only
- On attendance actions, require liveness selfie based on company policy

### 10.5 Legal and Privacy Requirements

Biometric and location data are sensitive.

You must define:

- explicit consent flow
- retention period
- deletion policy
- purpose limitation
- country-specific lawful basis
- access restrictions
- encryption at rest

This is not optional.

## 11. Device Binding Flow

### Rules

- one active primary device per employee by default
- rebind requires OTP plus manager or admin approval, or recovery flow
- device change is logged
- suspicious rebind patterns trigger alerts

### Flow

1. Employee logs in on new device.
2. If no active device exists, it becomes primary after OTP verification.
3. If active device exists, login enters pending status.
4. Employee confirms via old device, OTP, or manager approval.
5. Old device token is revoked.

## 12. Scheduling and Shift Engine

### Capabilities

- fixed schedules
- rotating schedules
- overnight shifts
- split shifts up to 4 segments per day
- multi-location shifts
- multi-role shifts
- open shifts
- self-claim rules
- shift swap requests
- schedule templates
- bulk assignment
- version history

### Key Rules

- every shift has location, timezone, start, end, grace periods, break policy, role, and pay rule set
- changes must be versioned
- approved changes must notify affected staff
- schedule snapshots should be preserved for payroll traceability

## 13. Requests and Approval Engine

This must be generic, not hardcoded per request type.

### Request Type Definition

Each request type should support:

- unique code
- form schema
- required fields
- attachment rules
- approval workflow
- SLA
- visibility rules
- notification templates
- payroll impact flag
- attendance impact flag

### Examples

- vacation
- sick leave
- unpaid leave
- business trip
- shift change
- shift pickup
- advance payment
- equipment purchase
- office supply request
- custom incident

### Approval Engine

Approval flows should support:

- sequential approvers
- parallel approvers
- escalation
- fallback approver
- delegation
- deadline-based reminders

## 14. Tasks, Checklists, Audits

### Task Types

- one-time task
- recurring task
- opening checklist
- closing checklist
- audit checklist
- location inspection
- inventory count

### Checklist Answer Types

- boolean
- yes / no
- pass / fail
- score
- numeric value
- text
- single choice
- multiple choice
- photo required
- signature required

### Completion Flow

1. Task instance is assigned by rule or manually.
2. Employee opens task.
3. App enforces answer schema.
4. If photo required, app uses live camera only.
5. Data is stored with timestamps and optional geotag.
6. Score is calculated.
7. If manager approval is required, task enters `pending_approval`.
8. Manager approves or rejects with comment.

### Audit Dashboard

Managers should see:

- overdue tasks
- failed checkpoints
- low scoring checklists
- missing photos
- recent completion feed
- photo gallery by location and period

## 15. Communication Layer

### Modules

- announcements
- policy/document acknowledgment
- employee-manager chat
- team chat
- request comments
- task comments
- polls

### Rules

- all important actions should create notification events
- announcements can target tenant, location, department, or role
- documents can require acknowledgment and track timestamp
- chats should support attachments with retention rules

For MVP, build lightweight operational chat, not a full Slack replacement.

## 16. Payroll Input Engine

This should be positioned as payroll calculation support, not necessarily full legal payroll for all countries on day one.

### Inputs

- scheduled hours
- actual attendance events
- approved leaves
- overtime rules
- night hours
- weekend / holiday rules
- penalties
- manual adjustments

### Outputs

- payable hours summary
- penalties summary
- overtime summary
- attendance anomalies
- payroll period slip
- export files

### Important Principle

Keep raw attendance immutable.

If payroll edits are needed:

- create adjustment records
- version payroll calculations
- retain traceability from source event to final slip

## 17. Employee Card Design

The employee card is a major read model and should be one of the most optimized views in the system.

### Sections for Managers / HR

- profile summary
- current status: on shift, late, on break, absent, offline
- today timeline
- current assigned location
- position, department, manager
- contact and legal data
- device binding status
- biometric enrollment status
- recent attendance anomalies
- shifts and schedule history
- requests history
- tasks and checklist performance
- payroll metadata
- uploaded documents
- notes and internal comments
- audit log excerpt

### Sections Visible to Employee

- personal profile
- today shift
- check-in status
- upcoming schedule
- my requests
- my tasks
- my payroll slips
- company documents to acknowledge

## 18. Dashboard Design

## 18.1 Executive Dashboard

- headcount
- on-time arrivals
- lateness rate
- absence rate
- overtime trend
- open approvals
- incomplete critical tasks
- location heatmap
- top punctual employees
- top problem locations / departments

## 18.2 Operations Dashboard

- live attendance board
- by-location staffing status
- currently missing employees
- late arrivals today
- early departures today
- open shifts
- shift conflicts
- checklist failures

## 18.3 HR / Payroll Dashboard

- employees missing documents
- pending leave approvals
- payroll anomalies
- employees with repeated infractions
- payroll period readiness

## 18.4 Employee Home Screen

- current shift card
- check-in / check-out CTA
- break CTA
- today tasks
- pending approvals or requests
- announcements
- chat unread count

## 19. Reporting System

### Export Formats

- Excel
- CSV
- PDF

### Report Families

- attendance
- tardiness
- absence
- shift adherence
- task completion
- checklist scoring
- leave and requests
- payroll input
- employee activity
- audit trails

### Reporting Principles

- filters by period, location, department, manager, employee, role
- scheduled report generation
- saved report templates
- async generation for heavy reports
- object storage for generated files

## 20. Database Design Principles

Use PostgreSQL as source of truth.

### Main Table Groups

- tenants
- users
- employees
- employee_profiles
- devices
- locations
- departments
- positions
- shifts
- shift_templates
- shift_assignments
- attendance_events
- attendance_sessions
- attendance_exceptions
- request_types
- requests
- approvals
- tasks
- checklist_templates
- checklist_instances
- checklist_answers
- files
- announcements
- chats
- messages
- notifications
- payroll_periods
- payroll_calculations
- payroll_adjustments
- audit_logs

### Modeling Notes

- use UUIDs
- store timestamps in UTC
- store tenant_id on every tenant-scoped row
- use append-only audit logs
- use version tables for schedule and payroll-sensitive entities

## 21. File and Media Strategy

Store binary files outside PostgreSQL.

### In Object Storage

- selfie enrollment captures
- attendance selfie verifications
- task photos
- documents
- exports
- chat attachments

### In Database

- file metadata
- access scope
- MIME type
- size
- checksum
- processing status
- linked entity

### Media Processing

- resize images
- strip unsafe metadata if needed
- generate thumbnails
- scan for malware on file uploads

## 22. Security Requirements

### Authentication

- email + password or phone + OTP
- optional SSO later
- refresh token rotation
- device-bound sessions

### Authorization

- RBAC + scoped access
- field-level control for sensitive data

### Hardening

- rate limiting
- brute-force protection
- CSRF protection for web if cookie auth is used
- secure file access URLs
- encryption at rest for sensitive data
- secret rotation
- audit log for privileged actions

### Mobile Integrity

- rooted / jailbroken device detection where possible
- emulator detection where possible
- secure token storage
- certificate pinning later if threat model justifies it

## 23. Observability and Operations

You need operational visibility from day one.

### Required

- structured logs
- error tracking
- metrics
- tracing
- uptime checks
- queue monitoring
- slow query monitoring
- audit log access

### Suggested Stack

- Sentry for errors
- OpenTelemetry for traces
- Grafana / Prometheus-compatible metrics if scale justifies it
- Railway logs for early phase, but not as the only observability source

## 24. Deployment Model

### Web

- `Vercel`
- connects to backend API and GraphQL
- admin domain, e.g. `app.smart.com`

### Backend

- `Railway` for early stage deployment
- containerized API service
- background worker service
- WebSocket service if separated

### Database

- PostgreSQL managed instance

### Cache / Queue

- Redis managed instance

### Object Storage

- AWS S3, Cloudflare R2, Supabase Storage, or compatible provider

### Important Note About Railway

Railway is acceptable for MVP and early production. For heavy realtime, media processing, and large queues, keep migration path open to a more configurable platform later.

## 25. Docker Strategy

Create a full local environment in Docker.

### Containers

- `web-admin`
- `api`
- `worker`
- `postgres`
- `redis`
- optional `minio` for local object storage

### Local Commands

- `docker compose up` for full local stack
- separate profiles for dev and test

### Benefits

- reproducible onboarding
- consistent CI
- easy local integration testing

## 26. GitHub and CI/CD

### Repository Rules

- protected `main`
- pull requests required
- semantic branch naming
- conventional commits recommended

### CI

- lint
- typecheck
- unit tests
- integration tests
- mobile build validation
- Docker image build

### CD

- Vercel preview deployments for web
- Railway staging and production services
- migrations applied in controlled deploy step

## 27. Integration Strategy

Expose integrations through REST and webhooks first.

### Integration Types

- payroll/accounting systems
- POS / ERP systems
- 1C
- iiko
- BI exports

### Requirements

- API keys or OAuth for integrations
- webhook signing
- retry logic
- idempotency keys for imports
- mapping layer for external IDs

## 28. Offline and Mobile Sync

Mobile cannot depend on permanent connectivity.

### Mobile Offline Strategy

- cache current schedule, assigned tasks, and draft requests locally
- allow draft creation offline where safe
- queue unsent actions locally
- do not finalize attendance offline without server confirmation

### Why

Attendance is legally and operationally sensitive. Offline check-in can exist only as a limited pending attempt, not as an accepted final event until server validation.

## 29. Event-Driven Backbone

Use domain events internally.

Examples:

- `attendance.checked_in`
- `attendance.checked_out`
- `request.submitted`
- `request.approved`
- `shift.updated`
- `task.completed`
- `announcement.published`

Uses:

- cache invalidation
- notifications
- realtime broadcasts
- audit log creation
- report snapshot updates
- payroll recalculation triggers

## 30. Suggested Service Boundaries

For MVP start as a modular monolith, not microservices.

### Why

- domain is complex
- team is likely small initially
- faster delivery and easier transactions
- fewer operational failures

### Internal Modules

- auth
- org
- employees
- attendance
- schedules
- requests
- approvals
- tasks
- communication
- payroll
- reports
- integrations
- notifications

Later, if needed, split heavy modules such as chat, media processing, or reporting.

## 31. MVP Scope Recommendation

Do not build every feature at once.

### MVP Phase

- tenant setup
- employee records
- auth and device binding
- attendance with geolocation
- selfie verification baseline
- schedules and shift templates
- vacation / sick leave / custom requests
- manager approval flows
- employee and manager dashboards
- exports for attendance and payroll input
- announcements
- checklist tasks

### Phase 1.5

- open shifts
- shift swaps
- chat
- advanced payroll rules
- advanced document acknowledgment
- scheduled reports

### Phase 2

- analytics and AI assistant
- deeper 1C / iiko integrations
- advanced benchmarking and forecasting

## 32. Delivery Roadmap

### Stage 0. Discovery and Legal

- validate countries and compliance requirements
- define biometric policy
- define payroll scope per market
- define approval policies and core request types

### Stage 1. Platform Foundation

- monorepo
- auth
- tenant model
- employee model
- org structure
- Docker environment
- CI/CD

### Stage 2. Attendance Core

- geofencing
- device binding
- selfie enrollment
- check-in / out
- manager live dashboard
- alerts and exceptions

### Stage 3. Scheduling and Requests

- shifts
- templates
- bulk assignment
- leave and request engine
- approval chains

### Stage 4. Tasks and Compliance

- task templates
- checklist instances
- photo proof
- approval flow
- audit dashboard

### Stage 5. Payroll and Reporting

- payroll rule engine
- slips
- exports
- scheduled reports

### Stage 6. Communication and Integrations

- announcements
- document acknowledgment
- chat
- public API
- webhooks

## 33. Key Risks

### Product Risks

- too much scope at once
- country-specific payroll complexity
- privacy concerns around face verification
- managers demanding custom logic for every workflow

### Technical Risks

- GraphQL overuse for write-heavy flows
- cache invalidation bugs
- fragile attendance verification on weak GPS signals
- high storage costs from photos and documents
- queue overload from report generation and notifications

### Operational Risks

- false attendance rejections harming trust
- poor device recovery flow blocking employees
- inadequate audit logs creating compliance issues

## 34. Final Recommended Technical Decisions

### Recommended Core Stack

- Monorepo: `pnpm + Turborepo`
- Web admin: `Next.js`
- Mobile: `React Native`
- Backend: `NestJS`
- Primary DB: `PostgreSQL`
- Cache / pubsub / queue primitives: `Redis`
- Storage: `S3-compatible`
- Realtime: `WebSockets + push notifications`
- API: `REST + GraphQL hybrid`
- Infra: `Docker + GitHub + Railway + Vercel`

### Why This Stack

- one shared language across most of the stack
- strong admin and mobile ecosystem
- good fit for realtime, queues, typed contracts, and modular domain logic
- easier hiring and maintenance for SaaS product evolution

## 35. What the System Will Look Like End-to-End

### Employee Side

- opens mobile app
- sees shift, tasks, requests, announcements
- checks in with location + selfie + bound device
- completes tasks and requests
- receives notifications and payroll slips

### Manager Side

- opens web dashboard
- sees live staffing and exceptions
- manages shifts and approvals
- monitors tasks and photo-backed execution
- exports reports and payroll inputs

### System Side

- stores truth in PostgreSQL
- uses Redis for cache, realtime fanout, counters, and queues
- stores media in object storage
- pushes notifications to web and mobile
- writes audit logs for all critical actions
- exposes APIs for external systems

## 36. Immediate Next Step

After this plan, the next correct step is not coding everything at once.

The next step should be creation of:

1. product requirements document by module
2. data model draft
3. role and permission matrix
4. API contract draft
5. MVP sprint breakdown

Only after that should implementation begin.

## 37. UX and Interface Strategy

The system must be designed for two very different behavior patterns.

### Employee UX Priorities

- one dominant action at a time
- mobile-first navigation
- extremely low friction for daily attendance
- minimal typing
- clear explanation of why camera and location are needed
- calm, non-accusatory language for verification failures

### Manager UX Priorities

- dashboard starts with exceptions, not generic summaries
- list actions and inline approvals to reduce clicks
- persistent filters and saved views
- dense information layout without clutter
- fast drill-down from KPI to employee or shift detail

### Required UX Standard

- employee can perform daily attendance in 3 taps or fewer after opening the app
- manager can identify absence and lateness issues within seconds of opening dashboard
- realtime updates must not reset filters or scroll state
- all errors must include a clear next step

Detailed UX rules are documented in `UX_GUIDELINES.md`.
