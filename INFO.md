# Smart

## Product Summary

Smart is a workforce operations platform for companies that need strict control over attendance, schedules, internal requests, task execution, and payroll-related calculations.

The product consists of:

- Web admin panel for owners, HR, operations managers, and supervisors
- Mobile app for employees on iOS and Android
- Backend platform with API, business logic, integrations, notifications, and reporting

The system is designed for organizations with multiple locations, departments, positions, and shift patterns.

## Core Value

Smart gives management one operational system for:

- attendance and time tracking
- shift planning and change history
- employee requests and approvals
- internal communication
- task execution and checklist control
- audit trails and photo-confirmed field operations
- payroll input preparation and export
- reporting and integrations with external systems

## Main Product Principles

- Fast UX with aggressive caching and preloading
- Reliable audit trail for every critical action
- Strong anti-fraud controls for attendance
- Flexible approval chains and role-based access
- Multi-location and multi-department support
- Web + mobile parity for core workflows
- Production-ready infrastructure from day one

## User Roles

### Employee

- checks in, checks out, starts and ends breaks
- confirms attendance with geolocation and selfie verification
- views shifts, requests, payroll slips, tasks, announcements, and chat
- submits vacation, sick leave, shift change, expense, supply, and custom requests
- completes checklists and uploads real-time photos when required

### Manager / Supervisor

- monitors live attendance and exceptions
- approves requests, tasks, and checklist submissions
- manages schedules, open shifts, templates, and assignments
- receives alerts for absences, tardiness, and failed verifications
- tracks team performance and compliance

### HR / Operations / Payroll

- manages employee profiles and documents
- configures working rules, compensation rules, penalties, and payroll periods
- exports reports, timesheets, and payroll input files
- reviews attendance corrections and legal records

### Company Owner / Admin

- configures company structure, locations, departments, and permissions
- manages integrations, policies, notifications, and system settings
- has access to executive dashboards and cross-company reporting

## Functional Modules

### 1. Attendance and Time Tracking

- check-in, check-out, breaks
- GPS / precise location verification
- geofence by work location
- selfie-based identity verification
- one primary device per employee
- manual correction flow with approval and audit trail
- lateness, early leave, overtime, and night hour calculation

### 2. Shift Management

- fixed and flexible schedules
- shift templates
- mass assignment
- split shifts with multiple locations or roles in one day
- open shifts and self-claiming
- shift swap and shift request workflows
- full schedule change history

### 3. Requests and Approvals

- vacation
- sick leave
- day off
- business trip
- advance payment
- equipment request
- schedule change
- custom request types

Each request can have:

- custom fields
- attachments
- SLA and deadline rules
- multi-step approval chains
- role, department, and location conditions

### 4. Tasks, Checklists, and Audits

- recurring and one-time tasks
- checklist templates with different answer types
- manager approval for completion when required
- live camera-only photo attachment
- geotagged evidence
- scoring and pass threshold logic
- dashboard with real-time statuses and photo feed

### 5. Communication

- company announcements
- policy / document acknowledgment
- direct and group chats
- comments on tasks and requests
- surveys and anonymous polls

### 6. Payroll Input and Reporting

- working hour calculation
- overtime, night shifts, weekend and holiday rules
- penalty rules for lateness and early leave
- payroll slips for employees
- exports to Excel / CSV / PDF
- templates for accounting systems and third-party tools

### 7. Employee Database

- personal data
- employment data
- documents
- position and reporting line
- attendance history
- request history
- task and checklist history
- payroll and compensation metadata

## Product Constraints

- Attendance verification must be resistant to proxy actions and device sharing
- Biometric and location processing must be legally compliant
- Data must be segregated by tenant and organization structure
- System must remain responsive under large employee counts
- Mobile app must support unstable connectivity and delayed sync

## Initial Technical Direction

- Web admin: Next.js
- Mobile app: iOS + Android with one shared codebase where reasonable
- Backend: modular API platform
- Primary DB: PostgreSQL
- Cache / realtime / queue primitives: Redis
- API strategy: hybrid REST + GraphQL
- Deployment: Docker, GitHub, Railway for backend, Vercel for web

The full system design, flow definitions, infrastructure, and rollout plan are described in `PLAN.md`.
