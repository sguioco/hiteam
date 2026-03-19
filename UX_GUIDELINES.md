# Smart UX Guidelines

## 1. UX Principle

The system must feel operational, fast, and obvious. Employees should never need training to complete daily actions. Managers should understand team status within seconds.

## 2. Interface Philosophy

### For Employees

- mobile-first
- one primary action per screen
- minimal text entry
- large touch targets
- clear status colors
- step-by-step flows
- no overloaded forms

### For Managers

- overview first, detail on drill-down
- critical exceptions above normal information
- bulk actions guarded by previews and confirmations
- dense but readable tables
- sticky filters and saved views

## 3. Information Architecture

### Employee App Navigation

- Home
- Schedule
- Tasks
- Requests
- Inbox
- Profile

Home must show:

- current shift
- attendance state
- main action button
- next task or urgent task
- pending requests
- latest announcement

### Manager Web Navigation

- Dashboard
- Attendance
- Schedule
- Requests
- Tasks
- Employees
- Reports
- Communication
- Settings

Dashboard must answer immediately:

- who is absent
- who is late
- which approvals are blocked
- which locations have risk
- which tasks are overdue

## 4. Screen Rules

### Employee Home

- top card: current status and next legal action
- second card: today schedule
- third card: tasks due now
- fourth card: announcements / docs
- use persistent bottom navigation

### Attendance Action Screen

- show allowed action only
- show shift window and location requirement
- show verification progress states: location, device, selfie, submission
- if failure happens, show exact reason and next step

### Requests Screen

- split by `My Requests`, `Create Request`, `Templates`
- common requests accessible in one tap
- custom forms generated dynamically but visually standardized

### Schedule Screen

- employees: clean agenda view
- managers: calendar + list + staffing heat view

### Tasks Screen

- sort by `due now`, `today`, `upcoming`, `completed`
- show mandatory evidence chips: photo, comment, approval

### Employee Card in Admin

Tabs:

- Summary
- Attendance
- Schedule
- Requests
- Tasks
- Payroll
- Documents
- Audit Log

Summary tab must show:

- current status
- contact info
- organization placement
- device / biometric status
- recent anomalies

## 5. Visual System Direction

The interface should be premium, disciplined, and utilitarian.

Recommended design direction:

- crisp typography with strong hierarchy
- sharp, clean layout system
- restrained color palette with one decisive alert color
- avoid playful consumer-app styling
- avoid clutter, gradients, and decorative noise in admin areas
- use focused motion only for feedback and state transitions

## 6. Usability Rules

- every critical screen must have a single dominant action
- never hide attendance status behind secondary menus
- never require more than 3 taps for daily attendance
- every rejection or error must explain resolution
- approvals must show reason, requester, impact, and deadline
- managers must be able to act from list rows without opening every detail page

## 7. Accessibility Rules

- support high contrast states
- 44px minimum tap target on mobile
- keyboard support for admin web
- screen-reader labels for status icons and action buttons
- color must not be the only status indicator

## 8. Realtime UX Rules

- realtime updates should feel calm, not noisy
- use subtle row updates and status chips instead of constant reload flashes
- notification center should aggregate bursts
- when data refreshes, preserve user scroll and filters

## 9. Empty, Loading, and Error States

- use skeletons for dashboards and cards
- for heavy reports show background generation state
- for errors provide retry plus explanation
- empty states should guide next action, not just say no data

## 10. Mobile Camera and Location UX

- explain why camera or location is required before asking permissions
- if denied, provide direct remediation path to settings
- show accuracy and location readiness before allowing submit when possible
- camera capture must feel deliberate and trustworthy

## 11. Employee Comfort Rules

- avoid surveillance tone in wording
- use neutral language such as `Verification required` instead of accusatory language
- show what data is used and why
- keep attendance success feedback reassuring and fast

## 12. Manager Efficiency Rules

- default dashboard shows exceptions first
- bulk schedule edits require preview diff
- reports start from saved presets
- common approvals available inline

## 13. UX KPIs

- check-in completion rate
- average check-in duration
- failed verification rate
- request completion rate
- approval turnaround time
- overdue task rate
- manager clicks to resolve exception
