# Appointments

Booking records and visit management

## Get list of appointments

 - [GET /records/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_appointment_list.md): ####  Filtering Appointments

+ staff_id: team member ID. 

Use this to retrieve appointments for a specific team member

+ client_id: Client ID 

Use this to retrieve appointments for a specific client

+ created_user_id: User ID 

User who created the appointment 

Use this to filter appointments created by a specific user

+ start_date: Session start date (inclusive) 

Returns appointments with a session starting on or after this date

+ end_date: Session end date (inclusive) 

Returns appointments with a session ending on or before this date

+ c_start_date: Appointment creation date from 

Returns appointments created on or after this date

+ c_end_date: Appointment creation date until 

Returns appointments created on or before this date

+ changed_after: Modified or created after this datetime 

Returns appointments created or modified after the specified date and time

+ changed_before: Modified or created before this datetime 

Returns appointments created or modified before the specified date and time

## Create a New Appointment

 - [POST /records/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/create_appointment.md): Creates a standard Appointment or an Appointment in a Group Event.

For a standard Appointment, staff_id, services, client, datetime, and
seance_length are required.

For a Group Event Appointment, activity_id and client are required. The API
obtains staff_id, services, datetime, and seance_length from the Group Event.

To set custom Appointment Fields, pass an object in custom_fields, with each key
matching a field code configured for the Location. The Business User must have both
custom_fields_record_values_read_access and
custom_fields_record_values_edit_access.

## Get an Appointment

 - [GET /record/{location_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_appointment.md)

## Edit Appointment

 - [PUT /record/{location_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/update_appointment.md): Fully updates an Appointment. This is not a partial update: for a standard Appointment,
resend staff_id, services, client, datetime, and seance_length, including when
only custom_fields needs to change. A missing required field returns 422.

For a Group Event Appointment, send activity_id and client. The activity_id must
match the Appointment's current Group Event. The API obtains staff_id, services,
datetime, and seance_length from that Group Event.

### Updating only custom fields

1. Get the current Appointment.
2. Copy the required main fields into this request without changing them.
3. Add the new values to custom_fields, using each configured field code as a key.

The Business User must have both custom_fields_record_values_read_access and
custom_fields_record_values_edit_access. Without both permissions, custom Appointment
Field values are not updated.

### Editing restrictions

The request can be rejected when the Appointment is waiting for online payment, lies
outside the Business User's allowed editing period, is fully paid, or has an arrived
client and the Business User lacks the corresponding edit permission.

If is_sale_bill_printed is true, keep the resent date, time, client, attendance status,
Team Member, and Services unchanged when updating only custom fields. Changes covered by
the printed receipt can require reversing the receipt first.

## Delete Appointment

 - [DELETE /record/{location_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/delete_appointment.md)

## Get a List of Partner Appointments

 - [GET /records/partner](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_partner_appointment_list.md): #### Filtering appointments

+ salon_id: Location ID 

Use this to filter appointments for a specific location

+ start_date: Visit date from 

Filters appointments with a visit date starting from the specified date (inclusive)

+ end_date: Visit date until 

Filters appointments with a visit date up to the specified date (inclusive)

+ created_start_date: Appointment creation date from 

Filters appointments created on or after this date

+ created_end_date: Appointment creation date until 

Returns appointments created on or before this date

+ user_id: User ID 

Filters appointments created by a specific user

## Get a visit

 - [GET /visits/{visit_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_visit.md)

## Get Visit Details

 - [GET /visit/details/{location_id}/{record_id}/{visit_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_visit_details.md): Block "kkm_transaction_details_container"

Flag "last_operation_type"

| Meaning | Description |
| ------------- | ------------- |
| 0 | Print return receipt |
| 1 | Print sales receipt |

Types of all transactions with location account

| Meaning | Description |
| ------------- | ------------- |
| 0 |  Sales operation – Active for documents of type Visit |
| 1 | Sale return operation – Active for documents of type Visit |
| 2 | Correction operation |
| 4 | Shift opening operation – Opens a new POS shift |
| 5 | Shift closing operation – Closes the current POS shift |
| 9 | Get POS status – Retrieves the current status of the POS device |
| 11 | Get POS team status – Retrieves the status of all POS devices connected to the team |
| 12 | Correction operation |
| 13 | Print X-report – Prints a non-fiscal summary report of the current shift |
| 6 | Cash deposit – Registers a cash-in transaction in the POS |
| 7 | Cash withdrawal – Registers a cash-out transaction in the POS |

Statuses of All POS Operations

| Meaning | Description |
| ------------- | ------------- |
| 0 |  Connection error with POS – Unable to establish a connection with the POS device |
| 1 |  Success – Operation completed successfully |
| 2 | Sent for printing – The request has been sent to the POS and is waiting for print completion |
| 3 | Runtime error – An error occurred while processing the operation on the POS device |
| 4 | Status check error – Failed to retrieve the current status of the POS |
| 5 | Waiting for POS readiness – Operation is pending until the POS device becomes ready |

Document Types

| Meaning | Description |
| ------------- | ------------- |
| 1 | Sale of products |
| 2 | Provision of services |
| 3 | Arrival of products |
| 4 | Products write-off |
| 5 | Transfer of products |
| 6 | Inventory |
| 7 | Visit |
| 8 | Consumables write-off |

## Edit Visit

 - [PUT /visits/{visit_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/update_visit.md)

## Receipt PDF for the visit

 - [GET /attendance/receipt_print/{visit_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_visit_receipt_pdf.md)

## Get comments

 - [GET /comments/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_comments.md): The comment object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Comment ID |
| salon_id | number | location ID |
| type | number | 1 - comment to the team member, 0 - to the location |
| master_id | number | Team Member ID if type = 1 |
| text | string | Comment text |
| date | string | Date when the comment was left |
| rating | number | Rating (from 1 to 5) |
| user_id | number | Id of the user who left the comment |
| username | string | Name of the user who left the comment |
| user_avatar | string | Avatar of the user who left the comment |
| record_id | number | ID of the post after which the review was left (the value will be non-zero if the review was left through a link asking for a review after the visit) |

## Leave a Comment

 - [POST /comments/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/leave_comment.md)

## Create Recurring Appointments

 - [POST /company/{location_id}/schedules/{schedule_id}/client_schedules](https://developer.alteg.io/en/b2b-v1/openapi/appointments/create_timetable_client_schedule.md): Creates a recurring appointment series for a client based on an event schedule. Automatically generates future appointments according to the schedule pattern.

## Update Recurring Appointments

 - [PATCH /company/{location_id}/schedules/{schedule_id}/client_schedules/{client_schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/update_timetable_client_schedule.md): Updates a recurring appointment series by attaching or detaching schedule days. This creates or removes future appointments accordingly.

## Delete Recurring Appointments

 - [DELETE /company/{location_id}/schedules/{schedule_id}/client_schedules/{client_schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/delete_timetable_client_schedule.md): Deletes a recurring appointment series and all associated future appointments.

