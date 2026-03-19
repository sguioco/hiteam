# Smart Data Model

## 1. Modeling Principles

- PostgreSQL is the source of truth
- every tenant-scoped table contains `tenant_id`
- use UUID primary keys
- store timestamps in UTC
- soft delete where legally appropriate, hard delete only by policy
- immutable event tables for attendance and audit

## 2. Core Entity Groups

### 2.1 Tenant and Access

#### tenants
- id
- name
- slug
- status
- timezone
- locale
- created_at
- updated_at

#### users
- id
- tenant_id
- email
- phone
- password_hash
- auth_status
- last_login_at
- created_at
- updated_at

#### roles
- id
- tenant_id
- code
- name
- description

#### permissions
- id
- code
- resource
- action

#### role_permissions
- role_id
- permission_id

#### user_roles
- user_id
- role_id
- scope_type
- scope_id

#### sessions
- id
- tenant_id
- user_id
- refresh_token_hash
- device_id
- ip_address
- user_agent
- expires_at
- revoked_at
- created_at

### 2.2 Organization Structure

#### companies
- id
- tenant_id
- name
- external_code

#### locations
- id
- tenant_id
- company_id
- name
- code
- address_line_1
- address_line_2
- city
- region
- country
- postal_code
- latitude
- longitude
- geofence_radius_meters
- timezone
- status

#### departments
- id
- tenant_id
- company_id
- name
- code
- parent_department_id

#### teams
- id
- tenant_id
- department_id
- name
- manager_employee_id

#### positions
- id
- tenant_id
- name
- code
- level

### 2.3 Employee Domain

#### employees
- id
- tenant_id
- user_id
- employee_number
- first_name
- last_name
- middle_name
- birth_date
- gender
- employment_status
- hire_date
- termination_date
- company_id
- primary_location_id
- department_id
- team_id
- position_id
- manager_employee_id
- payroll_profile_id
- created_at
- updated_at

#### employee_profiles
- employee_id
- nationality
- language
- marital_status
- emergency_contact_name
- emergency_contact_phone
- tax_id
- national_id
- passport_number
- address_json
- notes

#### employee_documents
- id
- tenant_id
- employee_id
- document_type
- file_id
- issued_at
- expires_at
- verification_status
- metadata_json

#### employee_compensation_profiles
- id
- tenant_id
- employee_id
- pay_type
- base_rate
- currency
- overtime_rule_set_id
- penalty_rule_set_id
- night_rule_set_id
- holiday_rule_set_id
- payroll_group_id

### 2.4 Device and Verification

#### devices
- id
- tenant_id
- employee_id
- platform
- os_version
- app_version
- device_fingerprint
- device_name
- status
- is_primary
- bound_at
- last_seen_at
- revoked_at

#### biometric_profiles
- id
- tenant_id
- employee_id
- provider
- template_ref
- enrollment_status
- consent_version
- consented_at
- enrolled_at
- last_verified_at

#### biometric_verifications
- id
- tenant_id
- employee_id
- attendance_event_id
- provider
- liveness_score
- match_score
- result
- file_id
- verified_at
- metadata_json

### 2.5 Scheduling

#### shift_templates
- id
- tenant_id
- name
- code
- location_id
- position_id
- starts_at_local
- ends_at_local
- break_policy_id
- pay_rule_set_id
- color
- is_split_allowed

#### shifts
- id
- tenant_id
- template_id
- location_id
- position_id
- shift_date
- starts_at
- ends_at
- timezone
- segment_index
- parent_shift_id
- capacity
- is_open_shift
- status
- published_at
- version

#### shift_assignments
- id
- tenant_id
- shift_id
- employee_id
- assignment_status
- assigned_by_user_id
- assigned_at
- accepted_at
- declined_at

#### shift_change_log
- id
- tenant_id
- shift_id
- actor_user_id
- action_type
- before_json
- after_json
- created_at

### 2.6 Attendance

#### attendance_events
- id
- tenant_id
- employee_id
- shift_id
- event_type
- source
- occurred_at
- server_recorded_at
- latitude
- longitude
- accuracy_meters
- location_id
- device_id
- biometric_verification_id
- result
- exception_code
- notes

#### attendance_sessions
- id
- tenant_id
- employee_id
- shift_id
- check_in_event_id
- check_out_event_id
- total_minutes
- payable_minutes
- overtime_minutes
- late_minutes
- early_leave_minutes
- break_minutes
- status

#### attendance_exceptions
- id
- tenant_id
- employee_id
- shift_id
- exception_type
- severity
- detected_at
- resolved_at
- resolved_by_user_id
- resolution_note

#### attendance_corrections
- id
- tenant_id
- employee_id
- session_id
- requested_by_user_id
- status
- reason
- requested_changes_json
- approved_by_user_id
- approved_at

### 2.7 Requests and Approvals

#### request_types
- id
- tenant_id
- code
- name
- category
- form_schema_json
- attachment_policy_json
- approval_flow_id
- affects_attendance
- affects_payroll
- is_active

#### requests
- id
- tenant_id
- employee_id
- request_type_id
- title
- status
- submitted_at
- effective_from
- effective_to
- payload_json
- current_step_order
- closed_at

#### request_attachments
- id
- tenant_id
- request_id
- file_id
- uploaded_by_user_id

#### approval_flows
- id
- tenant_id
- name
- scope_json
- escalation_policy_json

#### approval_steps
- id
- tenant_id
- approval_flow_id
- step_order
- step_type
- approver_rule_json
- sla_hours
- is_required

#### approvals
- id
- tenant_id
- entity_type
- entity_id
- approval_step_id
- approver_user_id
- status
- acted_at
- comment

### 2.8 Tasks and Checklists

#### task_templates
- id
- tenant_id
- name
- code
- description
- assignment_rule_json
- recurrence_rule
- requires_approval
- requires_photo
- requires_geolocation
- pass_score
- is_active

#### checklist_templates
- id
- tenant_id
- task_template_id
- name
- version

#### checklist_template_items
- id
- tenant_id
- checklist_template_id
- sort_order
- label
- answer_type
- required
- scoring_rule_json
- validation_rule_json

#### task_instances
- id
- tenant_id
- task_template_id
- checklist_template_id
- employee_id
- location_id
- shift_id
- due_at
- started_at
- submitted_at
- approved_at
- approver_user_id
- status
- score

#### checklist_answers
- id
- tenant_id
- task_instance_id
- template_item_id
- answer_bool
- answer_number
- answer_text
- answer_json
- score_awarded
- created_at

#### task_evidence_files
- id
- tenant_id
- task_instance_id
- checklist_answer_id
- file_id
- captured_at
- latitude
- longitude

### 2.9 Communication

#### announcements
- id
- tenant_id
- title
- body
- audience_rule_json
- priority
- published_by_user_id
- published_at
- expires_at

#### announcement_reads
- announcement_id
- employee_id
- read_at
- acknowledged_at

#### chats
- id
- tenant_id
- chat_type
- title
- created_by_user_id
- created_at

#### chat_participants
- chat_id
- employee_id
- joined_at
- muted_until

#### messages
- id
- tenant_id
- chat_id
- sender_user_id
- body
- file_id
- created_at
- edited_at
- deleted_at

#### polls
- id
- tenant_id
- title
- description
- audience_rule_json
- is_anonymous
- closes_at
- created_by_user_id

#### poll_options
- id
- poll_id
- label
- sort_order

#### poll_votes
- id
- poll_id
- option_id
- employee_id
- created_at

### 2.10 Files and Notifications

#### files
- id
- tenant_id
- storage_provider
- storage_key
- bucket
- original_name
- mime_type
- size_bytes
- checksum
- status
- uploaded_by_user_id
- created_at

#### notifications
- id
- tenant_id
- user_id
- type
- title
- body
- entity_type
- entity_id
- channel_json
- read_at
- created_at

### 2.11 Payroll

#### payroll_periods
- id
- tenant_id
- name
- starts_at
- ends_at
- status
- closed_at

#### pay_rule_sets
- id
- tenant_id
- name
- rule_type
- config_json
- version

#### payroll_calculations
- id
- tenant_id
- payroll_period_id
- employee_id
- currency
- base_minutes
- overtime_minutes
- night_minutes
- holiday_minutes
- penalty_amount
- bonus_amount
- gross_amount
- net_amount
- status
- calculation_version
- generated_at

#### payroll_adjustments
- id
- tenant_id
- payroll_calculation_id
- adjustment_type
- amount
- reason
- created_by_user_id
- created_at

#### payroll_slips
- id
- tenant_id
- payroll_calculation_id
- employee_id
- file_id
- published_at

### 2.12 Audit and Integration

#### audit_logs
- id
- tenant_id
- actor_user_id
- entity_type
- entity_id
- action
- before_json
- after_json
- ip_address
- user_agent
- created_at

#### webhooks
- id
- tenant_id
- name
- target_url
- secret_hash
- event_types_json
- status

#### outbound_webhook_deliveries
- id
- tenant_id
- webhook_id
- event_type
- payload_json
- status
- response_code
- attempted_at

## 3. Important Relationships

- one tenant has many users, employees, locations, shifts, requests, tasks
- one employee belongs to one primary company, department, team, and position but may work across multiple locations via shifts
- one shift has many assignments
- one employee has many attendance events and many requests
- one request moves through many approvals
- one task instance has many checklist answers and evidence files
- one payroll calculation references one period and one employee

## 4. Read Models Needed for Performance

- employee_summary_view
- manager_team_attendance_view
- employee_card_view
- current_shift_status_view
- pending_approvals_view
- dashboard_kpi_view
- payroll_period_readiness_view

These can be materialized in PostgreSQL or cached in Redis depending on usage.
