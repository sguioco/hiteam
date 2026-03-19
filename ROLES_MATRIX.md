# Smart Roles Matrix

## 1. Roles

- `super_admin`
- `tenant_owner`
- `hr_admin`
- `operations_admin`
- `payroll_admin`
- `manager`
- `employee`
- `auditor`

## 2. Permission Legend

- `full`: create, read, update, delete, approve, export within scope
- `manage`: create, read, update, assign, approve within scope
- `read`: read-only
- `self`: only own records and actions
- `none`: no access
- `scoped`: access only within assigned company / location / department / reporting line

## 3. Matrix

| Module | super_admin | tenant_owner | hr_admin | operations_admin | payroll_admin | manager | employee | auditor |
|---|---|---|---|---|---|---|---|---|
| Tenant settings | full | full | read | read | read | none | none | read |
| Role management | full | full | none | none | none | none | none | read |
| Employee directory | full | full | full | scoped | read | scoped | self | read |
| Sensitive personal data | full | full | full | limited | limited | limited | self | read |
| Employee documents | full | full | full | scoped | read | limited | self | read |
| Attendance actions | full | full | read | manage | read | read | self | read |
| Attendance corrections | full | full | manage | manage | read | scoped | self-create | read |
| Live attendance board | full | full | read | full | read | scoped | none | read |
| Schedule templates | full | full | read | full | read | scoped-manage | none | read |
| Shift assignments | full | full | read | full | read | scoped-manage | self-read | read |
| Open shifts | full | full | read | full | read | scoped-manage | self-claim | read |
| Requests creation | full | full | manage | manage | read | scoped-manage | self | read |
| Request approval | full | full | manage | manage | read | scoped | none | read |
| Task templates | full | full | read | manage | none | scoped-manage | none | read |
| Task completion | full | full | read | manage | none | scoped-approve | self | read |
| Announcements | full | full | manage | manage | read | scoped-publish | read | read |
| Chat | full | full | manage | manage | none | scoped | self | read-if-allowed |
| Polls | full | full | manage | manage | none | scoped-manage | self-vote | read |
| Payroll rules | full | full | read | read | full | none | none | read |
| Payroll calculations | full | full | read | read | full | read-summary | self-slip | read |
| Reports | full | full | full | full | full | scoped | self-limited | read |
| Audit logs | full | read | read | read | read | limited | none | full |
| Integrations | full | full | none | read | read | none | none | read |

## 4. Scope Rules

### Manager scope

Manager can view and act on employees when at least one condition matches:

- employee directly reports to manager
- employee belongs to manager's assigned team
- employee works in manager's assigned location
- manager is assigned as approver for the workflow step

### HR scope

HR can manage employee profiles, documents, leave data, and legal records across configured tenant scope.

### Operations scope

Operations admin can manage schedules, attendance, tasks, and location operations but should not see full private legal or payroll detail unless separately granted.

### Payroll scope

Payroll admin can access compensation metadata, payroll calculations, adjustments, slips, and payroll exports, but should not manage chat, tasks, or schedule templates.

## 5. Field-Level Restrictions

Sensitive fields should not be exposed to all roles even when record access exists.

Examples:

- national ID and tax ID: HR, payroll, tenant owner, auditor
- biometric details: only system services and limited compliance roles
- compensation amount: payroll, HR, tenant owner, self where policy allows
- internal manager notes: manager chain, HR, tenant owner

## 6. Approval Rules

Approval access is not purely role-based. It depends on workflow assignment.

A user can approve only when:

- they are the designated approver for the current step
- the entity is inside their permitted scope
- they are not blocked by segregation-of-duties policy
