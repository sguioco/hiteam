# Smart API Spec

## 1. API Strategy

Use a hybrid API model.

- REST for commands, uploads, integrations, and mobile actions
- GraphQL for complex read models and dashboards

Base REST path:

- `/api/v1`

GraphQL path:

- `/graphql`

## 2. Authentication

### POST /api/v1/auth/login
Request:
```json
{
  "tenantSlug": "acme",
  "email": "user@acme.com",
  "password": "secret"
}
```
Response:
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "roleCodes": ["employee"]
  },
  "deviceBindingRequired": true
}
```

### POST /api/v1/auth/refresh
### POST /api/v1/auth/logout
### POST /api/v1/auth/request-password-reset
### POST /api/v1/auth/reset-password

## 3. Device Binding and Biometric

### POST /api/v1/devices/register
Registers current device fingerprint.

### POST /api/v1/devices/confirm-primary
Confirms this device as primary after OTP / approval.

### GET /api/v1/devices/me
Returns current device status.

### POST /api/v1/biometric/enroll/start
Creates enrollment session.

### POST /api/v1/biometric/enroll/complete
Completes biometric enrollment.

### POST /api/v1/biometric/verify
Performs liveness and face match for an action.

## 4. Attendance REST Endpoints

### GET /api/v1/attendance/me/status
Returns current attendance state, current shift, allowed actions, verification requirements.

Response:
```json
{
  "employeeId": "uuid",
  "date": "2026-03-07",
  "shift": {
    "id": "uuid",
    "startsAt": "2026-03-07T09:00:00Z",
    "endsAt": "2026-03-07T18:00:00Z",
    "location": {
      "id": "uuid",
      "name": "HQ"
    }
  },
  "attendanceState": "not_checked_in",
  "allowedActions": ["check_in"],
  "verification": {
    "locationRequired": true,
    "selfieRequired": true,
    "deviceMustBePrimary": true
  }
}
```

### POST /api/v1/attendance/check-in
Request:
```json
{
  "shiftId": "uuid",
  "location": {
    "latitude": 55.03,
    "longitude": 82.92,
    "accuracyMeters": 12
  },
  "deviceId": "uuid",
  "biometricVerificationId": "uuid"
}
```
Response:
```json
{
  "eventId": "uuid",
  "sessionId": "uuid",
  "result": "accepted",
  "flags": ["late"],
  "recordedAt": "2026-03-07T08:59:48Z"
}
```

### POST /api/v1/attendance/check-out
### POST /api/v1/attendance/break-start
### POST /api/v1/attendance/break-end
### POST /api/v1/attendance/corrections
### GET /api/v1/attendance/me/history
### GET /api/v1/attendance/team/live

## 5. Scheduling REST Endpoints

### GET /api/v1/shifts/me
### GET /api/v1/shifts/team
### POST /api/v1/shifts/templates
### POST /api/v1/shifts/bulk-assign
### POST /api/v1/shifts/open/{shiftId}/claim
### POST /api/v1/shifts/{shiftId}/swap-request
### GET /api/v1/shifts/{shiftId}/history

## 6. Requests REST Endpoints

### GET /api/v1/request-types
Returns dynamic request type definitions available to current user.

### POST /api/v1/requests
Request:
```json
{
  "requestTypeCode": "vacation",
  "title": "Vacation July",
  "effectiveFrom": "2026-07-10",
  "effectiveTo": "2026-07-20",
  "payload": {
    "comment": "Family trip"
  },
  "attachmentIds": ["uuid"]
}
```

### GET /api/v1/requests/me
### GET /api/v1/requests/pending-approvals
### POST /api/v1/requests/{requestId}/approve
### POST /api/v1/requests/{requestId}/reject
### POST /api/v1/requests/{requestId}/comment

## 7. Tasks REST Endpoints

### GET /api/v1/tasks/me
### GET /api/v1/tasks/team
### POST /api/v1/task-templates
### POST /api/v1/tasks/{taskId}/start
### POST /api/v1/tasks/{taskId}/submit
Request:
```json
{
  "answers": [
    {
      "templateItemId": "uuid",
      "answerBool": true
    },
    {
      "templateItemId": "uuid",
      "answerText": "Done"
    }
  ],
  "evidenceFileIds": ["uuid"],
  "location": {
    "latitude": 55.03,
    "longitude": 82.92
  }
}
```

### POST /api/v1/tasks/{taskId}/approve
### POST /api/v1/tasks/{taskId}/reject
### GET /api/v1/tasks/{taskId}/report

## 8. Communication REST Endpoints

### GET /api/v1/announcements
### POST /api/v1/announcements
### POST /api/v1/announcements/{id}/acknowledge
### GET /api/v1/chats
### POST /api/v1/chats
### GET /api/v1/chats/{chatId}/messages
### POST /api/v1/chats/{chatId}/messages
### GET /api/v1/polls
### POST /api/v1/polls
### POST /api/v1/polls/{pollId}/vote

## 9. Employee and Admin REST Endpoints

### GET /api/v1/employees/{employeeId}
### PATCH /api/v1/employees/{employeeId}
### GET /api/v1/employees/{employeeId}/documents
### POST /api/v1/employees/{employeeId}/documents
### GET /api/v1/employees/{employeeId}/summary

## 10. Payroll and Reports REST Endpoints

### GET /api/v1/payroll/me/slips
### GET /api/v1/payroll/periods
### POST /api/v1/payroll/calculate/{periodId}
### POST /api/v1/payroll/{calculationId}/adjustments
### GET /api/v1/reports/templates
### POST /api/v1/reports/generate
### GET /api/v1/reports/{reportId}

## 11. File Upload Flow

### POST /api/v1/files/presign
Returns signed upload URL and file metadata ID.

### POST /api/v1/files/complete
Marks file uploaded and triggers scanning / post-processing.

## 12. GraphQL Read Models

Recommended GraphQL queries:

### employeeHome
Returns:
- current shift
- current attendance state
- tasks due now
- unread notifications
- active announcements
- request summary

### managerDashboard
Returns:
- live attendance KPIs
- absent employees list
- late employees list
- pending approvals summary
- overdue tasks summary
- location summaries

### employeeCard(employeeId)
Returns:
- profile
- current status
- attendance summary
- schedule summary
- requests summary
- task performance
- payroll metadata
- document summary
- audit excerpt

### scheduleBoard(filters)
Returns:
- shifts
- assignments
- open shifts
- conflicts
- coverage gaps

### reportBuilderData
Returns:
- report templates
- filter options
- saved presets

## 13. WebSocket Events

Channels:

- `attendance.updated`
- `request.updated`
- `task.updated`
- `announcement.published`
- `chat.message.created`
- `notification.created`
- `schedule.updated`

## 14. API Design Rules

- all writes are idempotent where possible
- critical POST routes accept idempotency key header
- every mutation writes audit log
- use cursor pagination for activity feeds and chats
- use rate limits on auth, uploads, and attendance endpoints
- return machine-readable error codes plus human-readable message

## 15. Error Shape

```json
{
  "error": {
    "code": "ATTENDANCE_GEOFENCE_FAILED",
    "message": "You are outside the allowed work area.",
    "details": {
      "requiredRadiusMeters": 100,
      "actualDistanceMeters": 212
    },
    "requestId": "uuid"
  }
}
```
