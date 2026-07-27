# Business Management

Full-featured B2B API for business operations.

**Base URL:** `https://api.alteg.io/api`

## ⚠️ Version Status

**V1 will be gradually deprecated.** We recommend using [V2 API](../b2b-v2/openapi.yaml) for new integrations. V1 endpoints are maintained for backward compatibility, but new features will be released in V2 only.

## V1 and V2 parameter aliases

V1 accepts the canonical V2 terminology for query-string and request-body parameters while continuing to support legacy V1 names. This makes it possible to share request-building code between API versions. Common alias families include:

- `location_id`, `company_id`, and `salon_id`
- `chain_id`, `company_group_id`, and `salon_group_id`
- `team_member_id`, `staff_id`, and `master_id`
- `appointment_id` and `record_id`
- `product_id` and `good_id`

Singular, plural, and camelCase variants are supported where applicable. Send only one name from each alias family. If multiple aliases are supplied, explicitly supplied values are preserved and are not overwritten.

## Authentication

Requires both partner and user authorization:
```
Authorization: Bearer <partner_token>, User <user_token>
```


Version: 1.0.0
License: Altegio API Agreement

## Servers

Production
```
https://api.alteg.io/api/v1
```

## Security

### bearer

Type: apiKey
In: header
Name: Authorization

### user

Type: apiKey
In: header
Name: Authorization

### BearerPartner

Type: http
Scheme: bearer
Bearer Format: Bearer {PartnerToken}

### BearerPartnerUser

Type: http
Scheme: bearer
Bearer Format: Bearer {PartnerToken}, User {UserToken}

## Download OpenAPI description

[Business Management](https://developer.alteg.io/_bundle/en/b2b-v1/openapi.yaml)

## Authentication B2B

User authentication and session management for B2B integrations

### Authorize User

 - [POST /auth](https://developer.alteg.io/en/b2b-v1/openapi/authentication-b2b/authorize_user.md): When a user changes their password, their API key is regenerated. As a result, reauthorization is required using the new API key.

| Attribute | Type | Description |
| ------------- | ------------- | ------------- |
| login | string | The user's phone number in the format +13155550175, or their email address.|
| password | string | User password |

## Locations

Manage business locations (salons, clinics, etc.)

### Get a list of locations

 - [GET /companies](https://developer.alteg.io/en/b2b-v1/openapi/locations/get_location_list.md): Get a list of locations with data

### Create a location

 - [POST /companies](https://developer.alteg.io/en/b2b-v1/openapi/locations/create_location.md): Create new location

### Get location

 - [GET /company/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/locations/get_location.md): Getting information about the location.

### Change location

 - [PUT /company/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/locations/update_location.md): Change location data

### Delete location

 - [DELETE /company/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/locations/delete_location.md): Delete a location.

## Services

Service catalog management including categories and team member assignments

### Create a service category

 - [POST /service_categories/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/create_service_category.md)

### Get a list of services

 - [GET /services/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service_list.md): Returns a list of all services for the specified location

### Create a service

 - [POST /services/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/create_service.md): Method to create a service

### Update a service

 - [PUT /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/deprecated_update_service_by_id.md): Method to update a service by ID

### Update a service (partial)

 - [PATCH /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/patch_service.md): Method to partially update a service

### Delete a service

 - [DELETE /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/delete_service.md): Method to remove a service

### Get service category

 - [GET /service_category/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service_category.md)

### Change service category

 - [PUT /service_category/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/update_service_category.md)

### Delete service category

 - [DELETE /service_category/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/delete_service_category.md)

### Get a list of service categories

 - [GET /company/{location_id}/service_categories/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service_category_list.md): + Options
    + company_id (required, number) - location ID
    + id (optional, number) - service category ID (to work with a specific category)
    + staff_id (optional, number) - team member ID (to get categories associated with a team member)

### Get a list of services / specific service

 - [GET /company/{location_id}/services/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service.md): + Parameter
    + company_id (required, number, 1) - location ID
    + service_id (optional, number, 1) - service ID

### Linking a Team Member to a Provided Service

 - [POST /company/{location_id}/services/{service_id}/staff](https://developer.alteg.io/en/b2b-v1/openapi/services/assign_service_to_team_member.md): Creates a team member service link with provided duration and bill of materials.

### Updating Team Member Service Link Settings

 - [PUT /company/{location_id}/services/{service_id}/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/update_service_team_member_assignment.md): Updates a team member service link with provided duration and bill of materials.

### Deleting a Team Member Service Link

 - [DELETE /company/{location_id}/services/{service_id}/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/remove_service_from_team_member.md): Deletes a team member service link.

### Update service links

 - [POST /company/{location_id}/services/links](https://developer.alteg.io/en/b2b-v1/openapi/services/update_service_links.md): Updates service configuration including:
- Team member assignments with custom duration and pricing
- Tech cards (technological cards) for each team member
- Required resources for the service
- Service name translations for different languages

This endpoint allows bulk updating of service-team member relationships
without affecting other service properties.

### Get a list of chain service categories

 - [GET /chain/{chain_id}/service_categories](https://developer.alteg.io/en/b2b-v1/openapi/services/get_chain_service_category_list.md)

### Deprecated. Get a list of service categories (deprecated)

 - [GET /service_categories/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/deprecated_get_service_category_list.md): Get a list of service categories

### Deprecated. Get a list of services / specific service (deprecated)

 - [GET /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/deprecated_get_service_list_by_id.md)

## Team Members

Staff management including positions and scheduling

### Get list of team members

 - [GET /staff/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_team_member_list.md): Returns all team members for the specified location.

Each team member includes:
- Basic info (name, specialization, avatar)
- Rating and reviews data
- Schedule availability
- Position and status

### Add new team member

 - [POST /staff/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/deprecated_create_team_member.md)

### Get a specific team member

 - [GET /staff/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_team_member_by_id.md)

### Edit Team Member

 - [PUT /staff/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/update_team_member.md)

### Delete team member

 - [DELETE /staff/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/delete_team_member.md)

### Quick create a team member

 - [POST /company/{location_id}/staff/quick](https://developer.alteg.io/en/b2b-v1/openapi/team-members/create_team_member_quick.md): Creates a new team member with a minimal set of parameters.

### Get Team Members / Specific Team Member

 - [GET /company/{location_id}/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_team_member.md)

### Deprecated. Get a list of location positions (deprecated)

 - [GET /company/{location_id}/staff/positions](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_position_list.md): This endpoint is deprecated. Use GET /v2/companies/{company_id}/positions instead.

The method allows you to get a list of current positions in the location.

Migration: The V2 Positions API provides enhanced functionality with full CRUD operations, pagination, and JSON:API format responses. See operation list_positions for details.

### Deprecated. Quick create a position (deprecated)

 - [POST /company/{location_id}/positions/quick](https://developer.alteg.io/en/b2b-v1/openapi/team-members/create_position_quick.md): This endpoint is deprecated. Use POST /v2/companies/{company_id}/positions instead.

Creates a new position in a location; position is created as a chain entity and at the same time linked to a location initiated its creation.

Migration: The V2 Positions API provides full CRUD operations with enhanced validation and JSON:API format responses. See operation create_position for details.

## Clients

Client database management with comments, files, and visit history

### Adding a Client

 - [POST /clients/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/create_client.md)

### Get a list of clients

 - [POST /company/{location_id}/clients/search](https://developer.alteg.io/en/b2b-v1/openapi/clients/get_client_list.md)

### Get a client

 - [GET /client/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/get_client.md)

### Edit client

 - [PUT /client/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/update_client.md)

### Delete client

 - [DELETE /client/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/delete_client.md)

### Bulk adding clients

 - [POST /clients/{location_id}/bulk](https://developer.alteg.io/en/b2b-v1/openapi/clients/bulk_create_clients.md)

### List of a comments for a client

 - [GET /clients/{location_id}/clients/{client_id}/comments](https://developer.alteg.io/en/b2b-v1/openapi/clients/list_client_comments.md): Returns a list of a comments for a client and a files in a client details uploads history.

### Add a comment for a client

 - [POST /clients/{location_id}/clients/{client_id}/comments](https://developer.alteg.io/en/b2b-v1/openapi/clients/create_client_comment.md): Creates a new text comment for a client.

### Delete a comment for a client

 - [DELETE /clients/{location_id}/clients/{client_id}/comments/{comment_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/delete_client_comment.md): Deletes a comment for a client; does not delete files uploaded that triggered creation of a comment.

### Sample Request to Get a List of Client Files

 - [GET /company/{location_id}/clients/files/{client_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/get_client_file_list.md): A list of uploaded client files can be retrieved by providing both the location ID and the client ID in the request.
The client ID can be obtained from the client collection.

The response returns an array of client files.


Each client file has the following structure:

| Field | Type | Description |
| -----------------| ------- | -------------------------------------------------- ------------------------ |
| id | number | File ID |
| client_id | number | Client ID |
| name | string | Filename with extension |
| description | string | File description |
| extension | string | File name extension |
| mime | string | MIME file type |
| link | string | File download link |
| date_create | string | File upload date in ISO8601 format |
| size | string | Formatted file size string |
| username | string | The name of the user who uploaded the file |
| user_avatar | string | Avatar of the user who uploaded the file |
| can_edit | boolean | Is there a right to change and delete the file? true - there is a right, false - there is no right |

### Delete request example

 - [DELETE /company/{location_id}/clients/files/{client_id}/{file_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/delete_client_file.md)

### Search by customer history

 - [POST /company/{location_id}/clients/visits/search](https://developer.alteg.io/en/b2b-v1/openapi/clients/search_client_visits.md): Displays the client’s visit history.This method returns the client’s appointment and product purchase history, grouped by visit. Data is filtered based on visit status and paid status.
The client is identified using either the client_id or client_phone parameter. All other parameters are optional. 
Results are sorted by visit date and paginated in batches of 25 items. If multiple visits share the same date as the last item on the page, they will be included on the current page to ensure complete grouping.
To retrieve the next page, use the from and to values provided in the meta field of the current response.

### Deprecated. Get a list of clients (deprecated)

 - [GET /clients/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/clients/deprecated_get_client_list.md): + Parameter
    + company_id (required, number, 1) - location ID
    + page (number, 1) - Page number
    + count (number, 20) - Number of clients per page


#### Client filtering
+ fullname:Joh (optional, string) - Name (part of name) to filter clients
+ phone:1315 (optional, string) - Phone (part of the number) for filtering clients
+ email:test@ (optional, string) - Email (part) for client filtering
+ card:5663rt (optional, string) - Card (part) for filtering customers by loyalty card number
+ paid_min:100 (optional, number) - Minimum amount paid, to filter customers by the amount of payments
+ paid_max:0 (optional, number) - Maximum amount paid, to filter customers by the amount of payments
+ paid_max:0 (optional, number) - Maximum amount paid, to filter customers by the amount of payments
+ id:66 (optional, number) - ID of one client for filtering clients
+ id[]: 66 (optional, array) - IDs of multiple clients to filter
+ changed_after: '2000-01-01T00:00:00' (optional, string) - Filtering clients changed/created since a specific date and time
+ changed_before: '2020-12-31T23:59:59' (optional, string) - Filtering clients changed/created before a specific date and time

## Users & Permissions

User account management and role-based access control

### Get location users

 - [GET /company/{location_id}/users](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_location_users.md): The method allows you to get users of the location.  
 location User object:

| Attribute  | Type | Description |
| ------------- | ------------- | ------------- |
|  id  |  number   | User ID   |
|  name  | string  | User name  |
|  phone  | string  | User phone |
| email  | string  | User email |
| information  | string  | User information |
|  is_approved  |  boolean | Whether the user accepted the invitation to manage the location  |
|  is_non_deletable  |  boolean  | Whether the user is non-deletable

### Remove the user from the location

 - [DELETE /company/{location_id}/users/{user_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/remove_user_from_location.md)

### Get a list of rights

 - [GET /user/permissions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_permission_list.md): + Parameter
    + company_id (required, number, 1) - location ID

### Getting a list of user roles

 - [GET /company/{location_id}/users/roles](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/list_roles.md): Returns a list of user roles along with permissions for each role.

### Getting a list of user roles in the context of a location user

 - [GET /company/{location_id}/users/{user_id}/roles](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_user_roles.md): Returns a list of user roles along with permissions for each role. Allows to get the editable status for each permission of a location user (is_editable field). This status depends on the current user's permissions.

### Getting permission values and user role

 - [GET /company/{location_id}/users/{user_id}/permissions](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_user_permissions.md): Return user role and list of permissions values.

### Updating permission values and user role

 - [PUT /company/{location_id}/users/{user_id}/permissions](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/update_user_permissions.md): Updates the role and permissions of the user, as well as the team member who is attached to this user.

### Create and Send an Invitation

 - [POST /user/invite/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/create_user_invitation.md): An invitation to manage a location is sent via email or phone as a link. By following the link and completing registration, the user gains access to manage the location according to the permissions assigned.
Permission assignment is performed in a separate request after the invitation is sent.

### Copy a User to Companies

 - [POST /company/{location_id}/users/{user_id}/copy_to_companies](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/copy_user_permissions_to_locations.md): Copies an active user and their permissions to multiple locations at once. If the user does not yet exist in a location, they will be added as an active user. If the user has already been invited to the location, only their permissions will be updated — however, they will still need to accept the invitation.

### Removing a User from Companies

 - [POST /company/{location_id}/users/{user_id}/remove_from_companies](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/remove_user_from_locations.md): Removes an active user from multiple companies at once.

### Deprecated. Get location users (deprecated)

 - [GET /company_users/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/deprecated_get_location_users.md): location User object

## Appointments

Booking records and visit management

### Get list of appointments

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

### Create a New Appointment

 - [POST /records/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/create_appointment.md): Creates a standard Appointment or an Appointment in a Group Event.

For a standard Appointment, staff_id, services, client, datetime, and
seance_length are required.

For a Group Event Appointment, activity_id and client are required. The API
obtains staff_id, services, datetime, and seance_length from the Group Event.

To set custom Appointment Fields, pass an object in custom_fields, with each key
matching a field code configured for the Location. The Business User must have both
custom_fields_record_values_read_access and
custom_fields_record_values_edit_access.

### Get an Appointment

 - [GET /record/{location_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_appointment.md)

### Edit Appointment

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

### Delete Appointment

 - [DELETE /record/{location_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/delete_appointment.md)

### Get a List of Partner Appointments

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

### Get a visit

 - [GET /visits/{visit_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_visit.md)

### Get Visit Details

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

### Edit Visit

 - [PUT /visits/{visit_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/update_visit.md)

### Receipt PDF for the visit

 - [GET /attendance/receipt_print/{visit_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/get_visit_receipt_pdf.md)

### Get comments

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

### Leave a Comment

 - [POST /comments/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/leave_comment.md)

### Create Recurring Appointments

 - [POST /company/{location_id}/schedules/{schedule_id}/client_schedules](https://developer.alteg.io/en/b2b-v1/openapi/appointments/create_timetable_client_schedule.md): Creates a recurring appointment series for a client based on an event schedule. Automatically generates future appointments according to the schedule pattern.

### Update Recurring Appointments

 - [PATCH /company/{location_id}/schedules/{schedule_id}/client_schedules/{client_schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/update_timetable_client_schedule.md): Updates a recurring appointment series by attaching or detaching schedule days. This creates or removes future appointments accordingly.

### Delete Recurring Appointments

 - [DELETE /company/{location_id}/schedules/{schedule_id}/client_schedules/{client_schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/appointments/delete_timetable_client_schedule.md): Deletes a recurring appointment series and all associated future appointments.

## Events

Group events and class management

### Search Events

 - [GET /activity/{location_id}/search](https://developer.alteg.io/en/b2b-v1/openapi/events/search_events.md)

### Search Event Dates

 - [GET /activity/{location_id}/search_dates](https://developer.alteg.io/en/b2b-v1/openapi/events/search_event_dates.md)

### Get Event Date Range

 - [GET /activity/{location_id}/search_dates_range](https://developer.alteg.io/en/b2b-v1/openapi/events/get_event_date_range.md)

### Get Event Search Filters

 - [GET /activity/{location_id}/filters](https://developer.alteg.io/en/b2b-v1/openapi/events/get_event_search_filters.md)

### Duplicate Event

 - [POST /activity/{location_id}/{event_id}/duplicate](https://developer.alteg.io/en/b2b-v1/openapi/events/duplicate_event.md): A request for duplication can be made in 3 ways:

- Specifying a list of dates and times to duplicate

- Specifying the ID of the repetition strategy

- By specifying all repetition parameters

### Search Event Services

 - [GET /activity/{location_id}/services](https://developer.alteg.io/en/b2b-v1/openapi/events/search_event_services.md)

### List Event Duplication Strategies

 - [GET /activity/{location_id}/duplication_strategy](https://developer.alteg.io/en/b2b-v1/openapi/events/list_event_duplication_strategies.md): Duplication of Events occurs based on a set of parameters combined in the "duplication strategy" entity

| Field | Type | Description |
| ------------- | ------------- | ----------------------------------------- |
| title | string | Strategy name |
| repeat_mode_id| integer | Repeat mode |
| days | integer[] | List of days of the week: 0 Sun, 6 Fri |
| interval | integer | Break in searching for dates, in units of type |
| content_type | integer | Duplicate appointments? 1 - no, 2 - yes |

The repeat mode can take the values

| Meaning | Description | Break unit |
| -------- | ------------- | ------------------------------ |
| 1 | Daily | Day |
| 2 | Weekdays | - |
| 3 | Mon Wed Fri | - |
| 4 | Tue Thu | - |
| 5 | Every week | Week |
| 6 | Every month | Month |
| 7 | Every year | Year |

The days field is relevant only for mode 5 - week, for specifying specific days of repetition
If you specify repeat_mode = 5, days = [1,4], interval = 2, then the Event will be
repeat every 3rd week on Mon and Thu

### Create Event Duplication Strategy

 - [POST /activity/{location_id}/duplication_strategy](https://developer.alteg.io/en/b2b-v1/openapi/events/create_event_duplication_strategy.md)

### Update Event Duplication Strategy

 - [POST /activity/{location_id}/duplication_strategy/{strategy_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/update_event_duplication_strategy.md)

### Deprecated. Get Event (deprecated)

 - [GET /activity/{location_id}/{event_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/get_event.md): This endpoint is deprecated. Use GET /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides JSON:API formatted responses. See operation get_event for details.

### Deprecated. Update Event (deprecated)

 - [PUT /activity/{location_id}/{event_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/update_event.md): This endpoint is deprecated. Use PUT /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides enhanced validation and JSON:API formatted responses. See operation update_event for details.

### Deprecated. Delete Event (deprecated)

 - [DELETE /activity/{location_id}/{event_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/delete_event.md): This endpoint is deprecated. Use DELETE /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides JSON:API formatted responses. See operation delete_event for details.

### Deprecated. Create Event (deprecated)

 - [POST /activity/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/events/create_event.md): This endpoint is deprecated. Use POST /v2/locations/{location_id}/events instead.

Migration: The V2 Events API provides enhanced validation, better error handling, and JSON:API format responses. See operation create_event for details.

## Schedule & Resources

Timetables, schedules, and resource allocation

### Get schedule of a specific team member

 - [GET /schedule/{location_id}/{team_member_id}/{start_date}/{end_date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_team_member_schedule.md)

### Change schedule of a specific team member

 - [PUT /schedule/{location_id}/{team_member_id}/{start_date}/{end_date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_team_member_schedule.md)

### Get a list of dates for Appointment Calendar

 - [GET /timetable/dates/{location_id}/{date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_appointment_calendar_dates.md): The Appointment Calendar dates are returned as an array of date strings, for example: [\"2026-10-26\", \"2026-10-30\"]. To retrieve this list, you must provide a reference date. The response will return the available working dates of the specified location or team member relative to that date

### Get a list of sessions for the Appointment Calendar

 - [GET /timetable/seances/{location_id}/{team_member_id}/{date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_appointment_calendar_sessions.md): The sessions object for the log has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| time | string | Session time (17:30 for example) |
| free | boolean | Free time or busy |

### Getting Resources at a Location

 - [GET /resources/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_resource_list.md)

### Search a Schedule by Event

 - [GET /company/{location_id}/schedules/search/{entity_type}/{entity_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/search_timetable_event_schedules_by_event.md): Search for a schedule based on the appointment or event linked to it, or based on the associated appointment or event.

### Create a Schedule

 - [POST /company/{location_id}/schedules](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/create_timetable_event_schedule.md): Creates a schedule for appointments or events based on the original associated entity.

### Update a Schedule

 - [PATCH /company/{location_id}/schedules/{schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_timetable_event_schedule.md): Updates the settings of a schedule containing appointments or events.

### Delete a Schedule

 - [DELETE /company/{location_id}/schedules/{schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/delete_timetable_event_schedule.md): Completely deletes a schedule along with all its series and the linked appointments or events.

### Create a Schedule Series

 - [POST /company/{location_id}/schedules/{schedule_id}/days](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/create_timetable_schedule_day.md): Adds a new series to an existing schedule of appointments or events.

### Update a schedule series

 - [PATCH /company/{location_id}/schedules/{schedule_id}/days/{day_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_timetable_schedule_day.md): Updates the settings of a schedule series for appointments or events.

### Delete a schedule series

 - [DELETE /company/{location_id}/schedules/{schedule_id}/days/{day_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/delete_timetable_schedule_day.md): Deletes a schedule series and all appointments or events linked to it.

### Get a List of Scheduled Appointments and Events

 - [GET /company/{location_id}/schedules/{schedule_id}/days/{day_id}/events](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/list_timetable_schedule_day_events.md): Prints  a list of events of scheduled records/activities.

### Retrieving Appointment Calendar Settings

 - [GET /company/{location_id}/settings/timetable](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_appointment_calendar_settings.md)

### Update Appointment Calendar settings

 - [PATCH /company/{location_id}/settings/timetable](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_appointment_calendar_settings.md)

### Get team member schedules

 - [GET /company/{location_id}/staff/schedule](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_team_member_schedule_list.md): Retrieves work schedules for team members as working intervals.

Optionally includes:
- Busy intervals (appointments and events)
- Off-day type identifiers

Query Parameters:
- start_date / end_date - Date range for schedule search
- staff_ids[] - Filter by specific team members
- include[] - Include additional data (busy_intervals, off_day_type)

### Set team member schedules

 - [PUT /company/{location_id}/staff/schedule](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/set_team_member_schedule.md): Sets work schedules for team members by date.

Supports both setting new schedules and deleting existing ones in a single request.

Returns the resulting schedules for affected team members within the date range
from minimum to maximum modified date.

### Update team member schedule (deprecated) (deprecated)

 - [PUT /schedule/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/schedule_team_member_update_deprecated.md): DEPRECATED: Use PUT /location/{location_id}/staff/schedule instead.

Updates the work schedule for a specific team member.

## Products

Product catalog and categories

### Search products and categories

 - [GET /goods/search/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/search_product.md): ### List of products and product categories

You can retrieve a list of products and product categories by providing the location ID. Use the search_term parameter to filter: 
+ Product categories by name or article 
+ Products by name, article, or barcode 

Limit the number of results using the max_count parameter.

If search_term is not provided, the response will return a list of root categories for the specified location. In this case, the max_count parameter is ignored. If search_term is provided, the system will first search among categories. If fewer than max_count results are found, the search will continue among products to fill the remaining count.

The result is returned as an array of products tree elements.


Product tree element has the following structure:

| Field | Type | Description |
| -------------| ------- | -------------------------------------------------- ----------------------------------------- |
| parent_id | number | Parent element ID (0 for root elements) |
| item_id | number | Item ID (0 if item is a category) |
| category_id | number | Product category ID (0 if the item is a product) |
| title | string | Product name or product category |
| is_chain | boolean | Is the element chain-bound? true - the element is connected to the chain, false - not connected |
| is_category | boolean | Is the element a category? true - category, false - product |
| is_item | boolean | Is the item a product? true - product, false - category |

### Get Products

 - [GET /goods/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product.md): + term: Name, article or barcode

+ page (number, 1) - Page number (not used if product_id is passed)

+ count (number, 25) - Number of products on the page (not used if product_id is passed)

+ category_id (number, 777) - Id of the product category (not used if product_id is passed)

+ changed_after (string) - filtering products changed/created since a specific date and time (not used if product_id is passed)

+ changed_before (string) - filtering products changed/created before a specific date and time (not used if product_id is passed)

### Edit Products

 - [PUT /goods/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/update_product.md): The method allows you to change the product parameters.
When editing units of measure for a product that already has inventory operations, you must add an array of rules for recalculating units of measure - correction_rules. Otherwise, the array is optional.

### Delete Items

 - [DELETE /goods/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/delete_product.md): The method allows you to remove the product

### Get a list of products

 - [GET /goods/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_products_list.md): Returns a list of all products for the specified location

### Create product

 - [POST /goods/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/create_product.md): The method allows you to create a product

### Example of a request to get categories

 - [GET /company/{location_id}/goods_categories/{parent_category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product_category_list.md)

### Example of a request to get the composition of a category

 - [GET /goods/category_node/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product_category_composition.md): ##№ Composition of the product category

Information on a product category and its descendants can be obtained by making a request specifying the location ID and product category.
Pagination is supported, specified by the page and count parameters.

Composition of a product category has the following structure:

| Field           | Type                                                                 | Description                                                                                               |
|-----------------|----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| parent_id       | number                                                               | Parent element ID (0 for root elements)                                                                   |
| item_id         | number                                                               | Item ID (always 0)                                                                                        |
| category_id     | number                                                               | Product category ID                                                                                       |
| title           | string                                                               | Product category name                                                                                     |
| is_chain        | boolean                                                              | Is the element chain-bound? true - the element is connected to the chain, false - not connected          |
| is_category     | boolean                                                              | Is the element a category? always true                                                                    |
| is_item         | boolean                                                              | Is the item a product? always false                                                                       |
| children        | array of objects (Product tree element) | Child elements of a product category                                                                      |
| children_count  | number                                                               | Total number of child products and categories (no recursion)                                              |

### Get a list of product categories by ID

 - [GET /goods_categories/multiple/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/get_product_category_list_by_ids.md)

### Create a Product Category

 - [POST /goods_categories/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/create_product_category.md): The method allows you to create a product category.

### Edit a Product Category

 - [PUT /goods_categories/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/update_product_category.md): The method allows you to edit the product category

### Delete a Product Category

 - [DELETE /goods_categories/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/delete_product_category.md): The method allows you to delete a product category

### Get a list of product categories (deprecated)

 - [GET /goods_categories/{location_id}/{category_id}](https://developer.alteg.io/en/b2b-v1/openapi/products/deprecated_get_product_category_list.md)

## Inventory

Stock management, storage operations, and tech cards

### Get location inventories

 - [GET /storages/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_location_inventories.md): The location inventory object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Inventory ID |
| title | string | Title |
| for_services | number | 1 - if used for automatic write-off of consumables |
| for_sale | number | 1 - if the default inventory for selling products |
| comment | string | Description of the inventory |

### Search for product transactions

 - [GET /storages/transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/search_for_product_transactions.md)

### Create an inventory operation

 - [POST /storage_operations/operation/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/create_inventory_operation.md): An inventory operation is created by submitting a document along with multiple product transactions in a single API request. If a payment type is specified, the corresponding financial transactions will be generated automatically.

### Create document

 - [POST /storage_operations/documents/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/create_document.md)

### Get document

 - [GET /storage_operations/documents/{location_id}/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_document.md)

### Update Document

 - [PUT /storage_operations/documents/{location_id}/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/update_document.md)

### Delete document

 - [DELETE /storage_operations/documents/{location_id}/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/delete_document.md)

### Create Transaction

 - [POST /storage_operations/goods_transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/create_transaction.md)

### Get a transaction

 - [GET /storage_operations/goods_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_transaction.md)

### Transaction update

 - [PUT /storage_operations/goods_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/update_transaction.md)

### Deleting a transaction

 - [DELETE /storage_operations/goods_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/delete_transaction.md)

### Get Product Transactions of a Document

 - [GET /storage_operations/documents/goods_transactions/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_document_product_transactions.md)

### Retrieve a list of bill of materials and consumables

 - [GET /technological_cards/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_bill_of_materials_list.md)

### Get the Bill of Materials for a Team Member’s Service

 - [GET /technological_cards/default_for_staff_and_service/{location_id}/{team_member_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_team_member_service_bill_of_materials.md)

### Retrieve a list of bill of materials and consumables

 - [GET /technological_cards/record_consumables/{location_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_appointment_consumables.md)

### Update Consumables for the Appointment-Service Association

 - [PUT /technological_cards/record_consumables/consumables/{location_id}/{record_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/update_appointment_service_consumables.md)

### Unlink Appointment-Service Association

 - [DELETE /technological_cards/record_consumables/technological_cards/{location_id}/{record_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/unlink_appointment_service_association.md)

## Sales

Sales transactions and document management

### Receipt of a Sales Transaction

 - [GET /company/{location_id}/sale/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/sales/get_sale_transaction.md)

### Payment at the Location Account and Loyalty (Various Methods)

 - [POST /company/{location_id}/sale/{document_id}/payment](https://developer.alteg.io/en/b2b-v1/openapi/sales/create_payment_with_loyalty_methods.md): As a response, information about the Sale operation is returned

### Delete a Loyalty Payment Transaction

 - [DELETE /company/{location_id}/sale/{document_id}/payment/loyalty_transaction/{payment_transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/sales/delete_loyalty_payment_transaction.md): As a response, information about the Sale operation is returned

### Delete a Cashier Payment Transaction

 - [DELETE /company/{location_id}/sale/{document_id}/payment/payment_transaction/{payment_transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/sales/delete_location_account_payment.md): As a response, information about the Sale operation is returned

## Payments

Payment processing, accounts, and KKM transactions

### Get document financial transactions

 - [GET /storage_operations/documents/finance_transactions/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_document_financial_transactions.md)

### Get location accounts

 - [GET /accounts/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_account_list.md): The location account object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Location account ID |
| title | string | Title |
| type | number | 1 - for non-cash payments, 0 for cash |
| comment | string | Description to the location account |

### Get transactions

 - [GET /transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_transactions.md): #### Transaction filtering

+ page: Page number

+ count: Number of customers per page

+ account_id: Checkout ID

+ supplier_id: Supplier ID

+ client_id: Client ID

+ user_id: user ID

+ master_id: team member ID

+ type: transaction type

+ real_money: Indicates whether this is a real-money (fiat) transaction

+ deleted: whether the transaction was deleted

+ start_date: start date of the period

+ end_date: end date of the period

+ balance_is: 0 - any balance, 1 - positive, 2 - negative

+ document_id: document ID

### Get Transactions by Visit or Appointment ID

 - [GET /timetable/transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_transactions_by_visit_or_appointment_id.md): #### Transaction filtering

+ record_id: Appointment ID

+ visit_id: ID of the visit

### Create a Financial Transaction

 - [POST /finance_transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/create_financial_transaction.md)

### Getting a financial transaction

 - [GET /finance_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_financial_transaction.md)

### Financial Transaction Update

 - [PUT /finance_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/update_financial_transaction.md)

### Deleting a transaction

 - [DELETE /finance_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/delete_financial_transaction.md)

## Notifications

SMS and email notifications to clients

### Send SMS to the list of clients

 - [POST /sms/clients/by_id/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_sms_to_clients.md): The object for creating SMS mailing has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| client_ids | array of numbers | Array of client IDs |
| text | string | SMS text message |

### Send SMS campaigns to customers matching the filters

 - [POST /sms/clients/by_filter/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_sms_campaign_to_filtered_clients.md): The object for creating SMS mailing has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| text | string | SMS text message |

#### Client filtering
+ fullname:'Joh' (optional, string) - Name (part of name) to filter clients
+ phone:'1315' (optional, string) - Phone (part of the number) to filter clients
+ email:'test@' (optional, string) - Email (part) for client filtering
+ card:'5663rt' (optional, string) - Card (part) to filter customers by loyalty card number

Attention: If there are no filters, SMS mailing will go to the entire database!

### Send Email newsletter according to the list of clients

 - [POST /email/clients/by_id/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_email_newsletter_to_clients.md): The object for creating an Email campaign has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| client_ids | array of numbers | Array of client IDs |
| text | string | Text Email Message |
| subject | string | Email Subject |

### Send email campaigns for clients matching the filters

 - [POST /email/clients/by_filter/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_email_campaign_to_filtered_clients.md): The object for creating an Email campaign has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| text | string | Text Email Message |
| subject | string | Email Subject |

#### Client filtering
+ fullname:'Joh' (optional, string) - Name (part of name) to filter clients
+ phone:'1315' (optional, string) - Phone (part of the number) to filter clients
+ email:'test@' (optional, string) - Email (part) for client filtering
+ card:'5663rt' (optional, string) - Card (part) to filter customers by loyalty card number

Attention: If there are no filters, email distribution will go to the entire database!

### Getting Message Statuses

 - [POST /delivery/status](https://developer.alteg.io/en/b2b-v1/openapi/notifications/get_message_status_list.md): ### Get message statuses
| Number | Title |
| ------------- | ------------- |
| 1 | Delivered |
| 2 | Not delivered |
| 4 | Sent to phone |
| 8 | Transferred to the operator |
| 16 | Rejected by operator |
| 52 | Not enough funds |

In the event of an error, the corresponding HTTP status code is returned. In some cases, a descriptive error message is also included in the response.
The following error codes may be returned by all API methods:

| error code | Http status code | Title | Description |
| ------------- | ------------- | ------------- | ------------- |
| 5 | 400 | ENTITY_VALIDATION_ERROR | The request body did not pass validation |
| 10 | 400 | FIELD_VALIDATION_ERROR | Parameter not validated |
| 15 | 403 | ACCESS_FORBIDDEN | The action is not available, the application does not have the required permissions. |
| 20 | 401 | INVALID_PARTNER_TOKEN | partner_token missing or invalid |
| 30 | 404 | RESOURCE_NOT_FOUND | The resource at the requested path does not exist |

When sending SMS, the delivery_callback_url attribute is passed in the request - this is the url to which message statuses should be sent.

Use it to send message statuses. Url to which message statuses should be sent - https://app.alteg.io/smsprovider/status/callback/{partner_token}

### Get notification settings in a location

 - [GET /notification_settings/{location_id}/notification_types](https://developer.alteg.io/en/b2b-v1/openapi/notifications/get_location_notification_settings.md): The method allows you to get notification settings in a location.

### Get User Notification Settings

 - [GET /notification_settings/{location_id}/users/{user_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/get_user_notification_settings.md): The method allows you to get notification settings for a particular location user.

### Change User Push Notification Settings

 - [POST /notification_settings/{location_id}/users/{user_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/update_user_notification_settings.md): The method allows you to change the user's PUSH notification settings.
The type of notification to be changed (record_create_online_staff or record_create_online_admin, etc.) should be selected based on the type of notification specified by the user (mode: admin or mode: team_member). Note: 'staff' in notification type names is a legacy term for team member.

## Online Booking Settings

Configure online booking behavior and forms

### Get Online Booking Settings

 - [GET /company/{location_id}/settings/online](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_online_booking_settings.md)

### Update Online Booking Settings

 - [PATCH /company/{location_id}/settings/online](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/update_online_booking_settings.md)

### Get timeslot settings

 - [GET /company/{location_id}/settings/timeslots](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_timeslot_settings.md): Retrieves the timeslot configuration for online booking at a location.

Timeslot settings control how available booking times are displayed to clients:
- Grid type (predefined, schedule-based, or dynamic)
- Available time range
- Step interval between slots
- Delay before nearest available slot
- Per-weekday and per-date overrides

Timeslot values are in seconds from midnight (e.g., 7200 = 02:00, 50400 = 14:00).

### Get a list of booking widgets

 - [GET /company/{location_id}/booking_forms](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_booking_widget_list.md)

### Create a Booking Widget

 - [POST /company/{location_id}/booking_forms](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/create_booking_widget.md)

### Get a Booking Widget

 - [GET /company/{location_id}/booking_forms/{form_id}](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_booking_widget.md)

### Delete Booking Widget

 - [DELETE /company/{location_id}/booking_forms/{form_id}](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/delete_booking_widget.md)

### Change Booking Widget

 - [PATCH /company/{location_id}/booking_forms/{form_id}](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/update_booking_widget.md)

## Analytics & Reports

Business analytics, charts, and Z-reports

### Get key location metrics

 - [GET /company/{location_id}/analytics/overall](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_location_analytics_overall.md): The method allows you to get the main indicators of the location for the selected period and compare with the previous period of the same duration

### Get occupancy data by day

 - [GET /company/{location_id}/analytics/overall/charts/fullness_daily](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_location_analytics_occupancy_daily.md)

### Get data on revenue by day

 - [GET /company/{location_id}/analytics/overall/charts/income_daily](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_location_analytics_revenue_daily.md)

### Get the Structure of Appointments by Source

 - [GET /company/{location_id}/analytics/overall/charts/record_source](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_appointment_analytics_by_source.md)

### Get the Structure of Appointments by Visit Status

 - [GET /company/{location_id}/analytics/overall/charts/record_status](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_appointment_analytics_by_status.md)

### Get Data on the Number of Appointments by Day

 - [GET /company/{location_id}/analytics/overall/charts/records_daily](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_location_analytics_appointments_daily.md)

### Get revenue statistics

 - [GET /company/{location_id}/analytics/loyalty_programs/income](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_loyalty_program_revenue_statistics.md): The method allows you to get statistics on revenue.

### Get team member return

 - [GET /company/{location_id}/analytics/loyalty_programs/staff](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_loyalty_program_team_member_statistics.md): The method allows you to get the return statistics for a team member

### Get customer statistics

 - [GET /company/{location_id}/analytics/loyalty_programs/visits](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_loyalty_program_client_statistics.md): The method allows you to get statistics on returning, new and lost customers

### Get day-end report data

 - [GET /reports/z_report/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/analytics-and-reports/get_day_end_report_data.md): + start_date: Report date

+ team_member_id: team member ID

## Tags

Label management for categorizing entities (deprecated, use v2)

### Create a Tag (Deprecated) (deprecated)

 - [POST /labels/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/tags/create_tag.md): Deprecated: Use POST /api/v2/companies/{company_id}/tags instead.

Creates a new tag for the specified location.

### Get location tags (Deprecated) (deprecated)

 - [GET /labels/{location_id}/{entity}](https://developer.alteg.io/en/b2b-v1/openapi/tags/get_tag_list_by_entity.md): Deprecated: Use GET /api/v2/companies/{company_id}/tags?entity={entity} instead.
Returns tags for the specified entity type.

The entity parameter accepts string aliases:
- common - common tags
- client - client tags
- record - appointment/record tags
- activity - activity/event tags

> Legacy support: Numeric values (0, 1, 2, 3) are also accepted but string aliases are preferred.

### Update Tag (Deprecated) (deprecated)

 - [PUT /labels/{location_id}/{tag_id}](https://developer.alteg.io/en/b2b-v1/openapi/tags/update_tag_by_tag_id.md): Deprecated: Use PUT /api/v2/companies/{company_id}/tags/{tag_id} instead.

### Delete location tag (Deprecated) (deprecated)

 - [DELETE /labels/{location_id}/{tag_id}](https://developer.alteg.io/en/b2b-v1/openapi/tags/delete_tag_by_tag_id.md): Deprecated: Use DELETE /api/v2/companies/{company_id}/tags/{tag_id} instead.

## Deposits

Client deposit accounts and operations

### Get a List of Client Accounts by Location and Client

 - [GET /deposits/company/{location_id}/client/{client_id}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_client_account_list_by_location_and_client.md)

### Get a list of client accounts by chain and a set of filters

 - [GET /deposits/chain/{chain_id}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_client_account_list_by_chain.md)

### Get a list of client accounts by chain and customer phone number

 - [GET /deposits/chain/{chain_id}/phone/{phone}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_client_account_by_chain_and_phone.md)

### Create a client account topup operation

 - [POST /deposits_operations/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/create_client_account_topup_operation.md): Creating a transaction with a client account involves creating a document, a transaction with a client account, and a financial transaction within a single API request.

### Get client account transaction history

 - [GET /chain/{chain_id}/deposits/{deposit_id}/history](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_chain_client_account_history.md): Retrieves the transaction history for a specific client account in the chain.

Returns a list of all transactions (top-ups, withdrawals, etc.) made on the client account.

Note: Requires chain-level permissions.

## Loyalty Cards

Loyalty card types, issuance, and manual transactions

### Get a List of Customer Cards by ID

 - [GET /loyalty/client_cards/{client_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_list_by_client_id.md): Returns a list of customer cards with programs that are active in this location

The attributes in the response to the request completely match the "Get a list of issued cards by phone number" method described above

### Get a List of Customer Cards by Phone Number

 - [GET /loyalty/cards/{phone}/{chain_id}/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_list_by_phone.md): Returns a list of customer cards with programs that are active in this location

| Attribute        | Type    | Description                                                                                   |
|------------------|---------|-----------------------------------------------------------------------------------------------|
| id               | int     | Loyalty card ID                                                                               |
| balance          | decimal | Loyalty card balance                                                                          |
| paid_amount      | decimal | Amount "Paid"                                                                                 |
| sold_amount      | decimal | Amount "Sold"                                                                                |
| visits_count     | int     | Number of visits                                                                              |
| number           | string  | Card number                                                                                   |
| type_id          | int     | Loyalty card type identifier                                                                  |
| salon_group_id   | int     | ID of the chain where the card was created                                                    |
| type             | object  | Object that contains the "id" and "title" fields: card type identifier and name             |
| salon_group      | object  | Object that contains the "id" and "title" fields: identifier of the chain where the card type was created and the name of this chain |
| programs         | array   | Array with information about promotions linked to a loyalty card                              |
| rules            | array   | Array with information about the rules configured in the action                               |

The programs array consists of objects with the following fields:

| Attribute         | Type    | Description                                   |
|-------------------|---------|-----------------------------------------------|
| id                | int     | Promotion ID                                  |
| title             | string  | Action name                                   |
| loyalty_type_id   | int     | Promotion type ID                             |
| item_type_id      | int     | Is cashback accrued from products             |
| value_unit_id     | int     | Bonus field — Discount % or Fixed amount      |
| group_id          | int     | ID of the chain where the action was created  |
| loyalty_type      | object  | Object with information about the action      |

The rules array consists of objects with the following fields:

| Attribute           | Type    | Description                                                  |
|---------------------|---------|--------------------------------------------------------------|
| id                  | int     | Rule ID                                                      |
| loyalty_program_id  | int     | Identifier of the promotion to which the rule is attached    |
| loyalty_type_id     | int     | Promotion type ID                                            |
| value               | decimal | Value from which the rule will work                          |

### Get User Loyalty Cards

 - [GET /user/loyalty_cards/{chain_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_user_loyalty_cards.md): Returns a list of cards of an authorized user with programs, filtering cards by location chain / location

### Get a list of card types available at the location

 - [GET /loyalty/card_types/salon/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_type_list.md): Returns a list of card types that are valid for the given location.

The attributes and their descriptions match those defined in the "Collection of Card Types Available to the Client" method described above.

### Get a List of Card Types Available for Issuance to the Client

 - [GET /loyalty/card_types/client/{location_id}/{phone}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_type_list_for_client.md): Returns a list of card types that are available for issuance to a location client.

| Attribute        | Type    | Description                                                                                   |
|------------------|---------|-----------------------------------------------------------------------------------------------|
| id               | int     | Card type identifier                                                                          |
| title            | string  | Card type name                                                                                 |
| salon_group_id   | int     | ID of the chain where the card type was created                                                |
| salon_group      | object  | An object that contains the "id" and "title" fields: identifier of the chain where the card type was created and the name of this chain |

### Get a List of Card Types Available at the Chain

 - [GET /chain/{chain_id}/loyalty/card_types](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_chain_loyalty_card_type_list.md)

### Issue a Loyalty Card

 - [POST /loyalty/cards/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/issue_loyalty_card.md): | Attribute | Type | Description |
|----------------------|--------|----------------- ------------------------------|
| loyalty_card_number | number | Loyalty card number |
| loyalty_card_type_id | number | Loyalty card type identifier |
| phone | number | Customer phone number (e.g., 13155550175 for +13155550175) |

### Remove a Loyalty Card

 - [DELETE /loyalty/cards/{location_id}/{card_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/remove_loyalty_card.md)

### Manual withdraw/deposit to loyalty card in location

 - [POST /company/{location_id}/loyalty/cards/{card_id}/manual_transaction](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/create_loyalty_card_transaction.md): Manual withdraw/deposit to loyalty card in location

### Manual withdraw/deposit to loyalty card in chain

 - [POST /chain/{chain_id}/loyalty/cards/{card_id}/manual_transaction](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/create_chain_loyalty_card_transaction.md): Manual withdraw/deposit to loyalty card in chain

## Subscriptions & Certificates

Membership subscriptions and gift certificates

### Get Client Memberships

 - [GET /loyalty/abonements](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_client_memberships.md): Returns a list of client's memberships by phone

### Get User Memberships

 - [GET /user/loyalty/abonements](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_user_memberships.md): Returns a list of memberships of an authorized user

### Get a List of Memberships by Filter

 - [GET /chain/{chain_id}/loyalty/abonements](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_membership_list.md)

### Get a List of Membership Types by ID

 - [GET /company/{location_id}/loyalty/abonement_types/fetch](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_membership_type_list_by_id.md): A list of membership types available at a location can be obtained by querying the location ID and membership type IDs.

The list is an array of membership types.

### Get a list of membership types by ID

+ Parameters
    + company_id (required, number) - location ID
    + id: 1 (optional, number) - membership type ID (you can specify several additional parameters &ids[]={id}

### Get a List of Available Membership Types

 - [GET /company/{location_id}/loyalty/abonement_types/search](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_membership_type_list.md): A list of membership types available at a location can be obtained by requesting the location ID.
The list can be filtered by membership type name by passing the title parameter. Pagination is supported, specified by the page and page_size parameters.

The list is an array of membership types.


Membership type has the following structure:

| Field                          | Type    | Description                                                                                                          |
|-------------------------------|---------|----------------------------------------------------------------------------------------------------------------------|
| id                            | number  | Membership type identifier                                                                                           |
| title                         | string  | Membership type name                                                                                               |
| allow_freeze                  | boolean | Is it possible to freeze memberships? true - allowed, false - not allowed                                            |
| freeze limit                  | number  | Maximum total freezing period (days)                                                                                 |
| salon_group_id                | number  | Identifier of the chain in which the membership type is valid                                                        |
| period                        | number  | Membership expiration date (0 if not set)                                                                            |
| period_unit_id                | number  | Membership expiration unit (list of possible values, if not set - 0)                                               |
| is_allow_empty_code           | boolean | Allow the sale of a membership without a code? true - allow, false - do not allow                                    |
| is_united_balance             | boolean | Total or separate membership balance: true - total, false - separate                                                 |
| united_balance_services_count | number  | Number of visits for total balance                                                                                   |


Measurement units of membership type validity period

| Meaning | Description |
|---------|-------------|
| 1       | Day         |
| 2       | Week        |
| 3       | Month       |
| 4       | Year        |

### Search available subscriptions for event

 - [GET /api/v1/company/{location_id}/client/{client_id}/loyalty/abonements/search_for_activity](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/search_memberships_for_event.md): Retrieves subscriptions that can be used to create a client schedule for a series of events.

This method returns subscriptions (memberships) that:
- Belong to the specified client
- Are valid and active
- Can be applied to the specified activity
- Have remaining visits available

Use cases:
- Display available subscriptions when scheduling recurring activity sessions
- Check which subscriptions cover specific activity types
- Validate subscription applicability before creating schedules

Note: Returns subscriptions with their types and availability intervals.

### Check membership availability for event

 - [GET /api/v1/company/{location_id}/client/{client_id}/loyalty/abonements/{membership_id}/check_for_activity](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/check_memberships_for_event.md): Validates a specific subscription for creating activity schedules.

Returns:
- Last possible appointment date based on membership expiration
- Available visit count for the selected subscription
- Schedule day IDs that can be booked

Use cases:
- Validate subscription before creating recurring appointments
- Check if subscription has enough visits for schedule
- Determine last bookable date based on expiration
- Pre-validate schedule parameters

Note: Requires schedule_day_ids parameter to check specific dates.

### Get client gift cards

 - [GET /loyalty/certificates](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_client_gift_cards.md): Returns a list of client gift cards by phone

| Attribute         | Type      | Description                                                              |
|-------------------|-----------|---------------------------------------------------------------------------|
| id                | int       | Gift card ID                                                              |
| number            | string    | Gift card code                                                            |
| balance           | decimal   | Current balance                                                           |
| default_balance   | decimal   | Initial balance                                                           |
| type_id           | int       | Gift card type identifier                                                 |
| status_id         | int       | Status ID                                                                 |
| created_date      | timestamp | Date of sale                                                              |
| expiration_date   | datetime  | Burn date                                                                 |
| type              | object    | Object with gift card type information                                    |
| status            | object    | An object with information about the current gift card status             |

The type array contains the following objects:

| Attribute                | Type      | Description                                                                                                           |
|--------------------------|-----------|-----------------------------------------------------------------------------------------------------------------------|
| id                       | int       | Gift card type identifier                                                                                            |
| title                    | string    | Type name                                                                                                             |
| balance                  | decimal   | Gift card denomination                                                                                               |
| is_multi                 | boolean   | Is it available for multiple debits                                                                                  |
| company_group_id         | int       | ID of the chain where the certificate type was created                                                               |
| item_type_id             | int       | Restriction on the use of redemption points. 0 - no limit, 1 - services only, 2 - some services + all products, 3 - some services, 4 - products only |
| expiration_type_id       | int       | The ID of the expiration limit. 0 - unlimited, 1 - fixed date, 2 - fixed term                                        |
| expiration_date          | timestamp | Burn date of all gift cards. Populated with expiration_type_id = 1                                                  |
| expiration_timeout       | int       | Validity period of gift card. Populated with expiration_type_id = 2                                                 |
| expiration_timeout_unit_id | int     | Time units. 1 - Day, 2 - Week, 3 - Month, 4 - Year                                                                   |
| is_allow_empty_code      | boolean   | Sale without code                                                                                                    |
| item_type                | object    | Object with item_type_id and its name                                                                               |

### Get user gift cards

 - [GET /user/loyalty/certificates](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_user_gift_cards.md): Returns a list of authorized user gift cards

### Get a List of Gift Card Types by ID

 - [GET /company/{location_id}/loyalty/certificate_types/fetch](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_gift_card_type_list_by_id.md): A list of gift card types available at the location can be obtained by querying the location ID and gift card type IDs.

The list is an array of gift card types.

### Get a List of Available Gift Card Types

 - [GET /company/{location_id}/loyalty/certificate_types/search](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_gift_card_type_list.md): A list of gift card types available at a location can be obtained by querying the location ID.
The list can be filtered by the name of the gift card type by passing the title parameter.
Pagination is supported, specified by the page and page_size parameters.

The list is an array of gift card types.


Gift card type has the following structure:

| Field                      | Type    | Description                                                                                                                        |
|----------------------------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| id                         | number  | Gift card type identifier                                                                                                          |
| title                      | string  | Gift card type name                                                                                                                |
| balance                    | number  | Gift card denomination                                                                                                           |
| is_multi                   | boolean | Write-off type: true - multiple write-off, false - single write-off                                                               |
| company_group_id           | number  | ID of the chain where the gift card type is valid                                                                                  |
| item_type_id               | number  | Application Constraint (list of possible values)                                                                                   |
| expiration_type_id         | number  | Expiration limit (list of possible values)                                                                                         |
| expiration_date            | string  | Fixed burn date in ISO8601 format (null if not set)                                                                                |
| expiration_timeout         | number  | Gift card validity period from the date of sale (0 if not set)                                                                     |
| expiration_timeout_unit_id | number  | The unit of measurement of the validity period of the gift card from the moment of sale (list of possible values, if not set - 0) |
| is_allow_empty_code        | boolean | Allow sale of gift card without code? true - allow, false - do not allow                                                           |


Gift Card Type Restriction

| Meaning | Description                     |
|---------|---------------------------------|
| 0       | Unlimited                       |
| 1       | Any services without products   |
| 2       | Any products without services   |
| 3       | Some services without products  |
| 4       | Some services and any products  |


Gift Card Type Expiration Limit

| Meaning | Description                            |
|---------|----------------------------------------|
| 0       | No expiration date                     |
| 1       | Fixed date for all instances           |
| 2       | Fixed period of validity from the date of sale |


Units of certificate type validity period

| Meaning | Description |
|---------|-------------|
| 1       | Day         |
| 2       | Week        |
| 3       | Month       |
| 4       | Year        |

## Loyalty Programs

Discount programs, referral programs, and loyalty transactions

### Get a List of Promotions Active in the Location

 - [GET /company/{location_id}/loyalty/programs/search](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/get_location_loyalty_program_list.md): The method allows you to get a list of promotions that are active for the specified location.

### Get loyalty transactions by visit

 - [GET /visit/loyalty/transactions/{visit_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/get_loyalty_transactions_by_visit.md): List of transactions for loyalty promotions for this visit

### Gift Card/Membership Code Generation

 - [GET /loyalty/generate_code/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/generate_loyalty_code.md): + Options
    + location_id (required, number, 1) - location ID
    + product_id (required, number, 1) - product ID (gift card/ membership)

### Apply Deduction from the Loyalty Card in the Visit

 - [POST /visit/loyalty/apply_card_withdrawal/{location_id}/{card_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/apply_loyalty_card_deduction.md): The amount deducted will not exceed the available bonus balance. If the value is set to 0, no write-off transaction will occur

### Cancel Withdrawal from the Loyalty Card During the Visit

 - [POST /visit/loyalty/cancel_card_withdrawal/{location_id}/{card_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/cancel_loyalty_card_withdrawal.md): Cancellation of write-off from the loyalty card.

### Apply a Discount Promotion in a Visit

 - [POST /visit/loyalty/apply_discount_program/{location_id}/{card_id}/{program_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/apply_discount_promotion.md): Applying a promotion to a visit, it only makes sense if there is a visit

### Cancel the Application of the Discount Promotion in the Visit

 - [POST /visit/loyalty/cancel_discount_program/{location_id}/{card_id}/{program_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/cancel_discount_promotion.md): Cancellation of the promotion applied to the visit.

### Apply Referral Program During a Visit

 - [POST /visit/loyalty/apply_referral_program/{location_id}/{chain_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/apply_referral_program.md): Applying a referral program to a visit

## Salary

Staff salary calculations, payroll, and schemes

### Receipt of mutual settlements of a team member grouped by date

 - [GET /company/{location_id}/salary/calculation/staff/daily/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/salary/search_team_member_calculation_daily_salary.md): The method allows location owner to get mutual settlements of a team member grouped by date.

### Receipt of mutual settlements of a team member

 - [GET /company/{location_id}/salary/calculation/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/salary/search_team_member_calculation_salary.md): The method allows location owner to get mutual settlements of a team member.

### Obtaining payroll schemes count for a team member

 - [GET /company/{location_id}/salary/calculation/staff/{team_member_id}/salary_schemes_count](https://developer.alteg.io/en/b2b-v1/openapi/salary/get_team_member_calculation_schemes_count.md): The method allows you to get salary calculation schemes count for a team member before trying to obtain calculation data.

### Search payroll calculations of a team member

 - [GET /company/{location_id}/salary/payroll/staff/{team_member_id}/calculation](https://developer.alteg.io/en/b2b-v1/openapi/salary/search_team_member_payroll_calculation.md): The method allows location owner to search payroll calculations for the period for a team member.

### Get payroll calculation details of a team member

 - [GET /company/{location_id}/salary/payroll/staff/{team_member_id}/calculation/{calculation_id}](https://developer.alteg.io/en/b2b-v1/openapi/salary/get_team_member_payroll_calculation.md): The method allows location owner to get details of a specific payroll calculation.

### Getting payroll for a period for a team member grouped by date

 - [GET /company/{location_id}/salary/period/staff/daily/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/salary/search_team_member_period_daily_salary.md): The method allows location owner to get the calculation for the period for a team member grouped by date.

### Getting payroll for a period for a team member

 - [GET /company/{location_id}/salary/period/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/salary/search_team_member_period_salary.md): The method allows location owner to get the calculation for the period for a team member.

### Get Mutual Settlements for a Specific Team Member

 - [GET /company/{location_id}/salary/staff/{team_member_id}/calculation](https://developer.alteg.io/en/b2b-v1/openapi/salary/get_team_member_salary_calculation.md): The method allows you to get mutual settlements of a specific team member. In the user's access rights, the checkbox "Access to payroll only for a specific team member" must be specified.

### Get Payroll for a Specific Team Member for a Given Period

 - [GET /company/{location_id}/salary/staff/{team_member_id}/period](https://developer.alteg.io/en/b2b-v1/openapi/salary/get_team_member_salary_period.md): The method allows you to get the calculation for the period for a specific team member.
In the user's access rights, the checkbox "Access to payroll only for a specific team member" must be checked.

### Obtaining own payroll schemes for a specific team member

 - [GET /company/{location_id}/salary/staff/{team_member_id}/salary_schemes](https://developer.alteg.io/en/b2b-v1/openapi/salary/get_team_member_salary_schemes.md): The method allows you to get own salary calculation schemes for a specific team member.
In the user's access rights, the checkbox "Access to payroll only for a specific team member" must be specified.

## Custom Fields

Custom field definitions for various entities

### Getting a collection of location fields

 - [GET /custom_fields/{field_category}/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/get_custom_field_list.md)

### Adding a Custom Field

 - [POST /custom_fields/{field_category}/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/create_custom_field.md): To add a field, the user must be part of the Chain associated with the location and have the appropriate access rights in the following section: Settings → Access → Custom Fields → Create custom fields

### Update a Custom Field

 - [PUT /custom_fields/{field_category}/{location_id}/{field_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/update_custom_field.md): To update a field, the user must be part of the Chain associated with the location and have the appropriate access rights in the following section Settings → Access → Custom Fields → Modify custom fields

### Remove a Custom Field from a Location

 - [DELETE /custom_fields/{field_category}/{location_id}/{field_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/delete_custom_field.md): To remove a field, the user must be part of the Chain associated with the location and have the appropriate access rights in the following section: Settings → Access → Custom Fields → Remove custom fields

## Chain Management

Multi-location chain operations and clients

### Obtaining chains available to the user

 - [GET /groups](https://developer.alteg.io/en/b2b-v1/openapi/chain-management/get_chain_list.md): The location chain object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Location chain ID |
| title | string | Location chain name |
| locations | array | List of chain locations |
| access | object | Object with access rights for chain management |

### Get a chain client by phone number.

 - [GET /group/{chain_id}/clients](https://developer.alteg.io/en/b2b-v1/openapi/chain-management/get_chain_client_by_phone_number.md): + Parameter
    + group_id (required, number, 43877) - ID of the location chain


#### Client filtering
+ phone:'+13155550175' (optional, string) - Phone to filter clients

## Chain Loyalty Programs

Chain-level loyalty programs and transactions

### Freeze membership

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/freeze](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_freeze.md): Freezes a subscription (membership) until the specified date.

The subscription's expiration date will be extended by the freeze period.
Frozen subscriptions cannot be used for appointments.

Requirements:
- Membership type must have allow_freeze: true
- Freeze period must not exceed freeze_limit from membership type

Note: Requires chain-level permissions.

### Unfreeze membership

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/unfreeze](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_unfreeze.md): Removes the freeze from a subscription (membership).

The subscription's expiration date will remain extended by the freeze period
that was already applied during the freeze.

Note: Requires chain-level permissions.

### Change membership balance

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/set_balance](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_set_balance.md): Modifies the remaining visit count for a subscription (membership).

For unified balance subscriptions:
- Use united_balance_services_count to set total visits

For separate balance subscriptions:
- Use services_balance_count array with service_id and balance for each service/category

Use cases:
- Adjust balance after administrative changes
- Correct errors in visit counts
- Add bonus visits

Note: Requires chain-level permissions.

### Change membership validity period

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/set_period](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_set_period.md): Modifies the validity period (duration) of a subscription (membership).

This changes how long the subscription remains active before expiring.

Period units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

Use cases:
- Extend expiration as customer service gesture
- Adjust period after policy changes
- Correct administrative errors

Note: Requires chain-level permissions.

### List membership types

 - [GET /chain/{chain_id}/loyalty/abonement_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_list.md): Retrieves all membership types available in the chain.

Note: Requires chain-level permissions.

### Create membership type

 - [POST /chain/{chain_id}/loyalty/abonement_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_create.md): Creates a new membership type at the chain level. Membership types define reusable packages
(e.g., "10 visits", "Monthly unlimited") that can be sold across multiple locations in the chain.

Important API Differences:
- services and service_categories must be objects (key-value pairs), not arrays
- Example: {"service_id": count} not [service_id]
- Some legacy documentation shows arrays, but the real API requires objects

Note: Requires chain-level permissions.

### Get membership type details

 - [GET /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_read.md): Retrieves detailed information about a specific membership type.

Note: Requires chain-level permissions.

### Update membership type

 - [PUT /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_update.md): Updates an existing membership type. You can update basic information
(title, cost, period) without modifying the service/category links.

Note: To preserve existing services, pass empty arrays for
services and service_categories fields.

### Delete membership type

 - [DELETE /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_delete.md): Deletes a membership type from the chain.

Warning: This action cannot be undone. Active subscriptions using this type
may be affected.

### Clone membership type

 - [POST /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}/clone](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_clone.md): Creates a copy of an existing membership type with a new ID.

The cloned membership type will:
- Have the same settings (cost, period, services, etc.)
- Get a modified title with " (2)" suffix automatically added
- Have a new unique ID
- Preserve all service/category links from the original

Note: Requires chain-level permissions.

### Restore deleted membership type

 - [POST /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}/restore](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_restore.md): Restores a previously deleted membership type.

Note: Requires chain-level permissions.

### Archive or unarchive membership type

 - [PATCH /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}/archive](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_archive.md): Archives or unarchives a membership type.

Archived membership types:
- Cannot be sold to new clients
- Existing active memberships remain functional
- Can be unarchived at any time

Note: Requires chain-level permissions.

### List certificate types

 - [GET /chain/{chain_id}/loyalty/certificate_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_list.md): Retrieves a list of certificate types at the chain level.

Returns all certificate types configured for the chain with optional filtering
and pagination.

Query Parameters:
- title - Filter by certificate type name (partial match)
- page - Page number (default: 1)
- page_size - Items per page (default: 10, max: 100)

Item Type Restrictions:
- 0 = All services and products
- 1 = Any services (no products)
- 2 = Any products (no services)
- 3 = Specific services only (no products)
- 4 = Specific services + any products

Expiration Types:
- 0 = No expiration
- 1 = Fixed date for all instances
- 2 = Fixed period from sale date

Expiration Units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

### Create certificate type

 - [POST /chain/{chain_id}/loyalty/certificate_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_create.md): Creates a new certificate type at the chain level.

Certificate types define gift certificate templates that can be sold across multiple locations.

Item Type Restrictions:
- 0 = All services and products
- 1 = Any services (no products)
- 2 = Any products (no services)
- 3 = Specific services only (no products)
- 4 = Specific services + any products

Expiration Types:
- 0 = No expiration
- 1 = Fixed date for all instances
- 2 = Fixed period from sale date

Expiration Units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

Balance Edit Types:
- 1 = Can be edited
- 2 = Cannot be edited

Note: After creation, certificate products are automatically created in inventory.

### Get certificate type

 - [GET /chain/{chain_id}/loyalty/certificate_types/{type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_get.md): Retrieves a specific certificate type by ID at the chain level.

Returns complete certificate type configuration including expiration rules,
restrictions, and online sale settings.

### Update certificate type

 - [PUT /chain/{chain_id}/loyalty/certificate_types/{type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_update.md): Updates an existing certificate type at the chain level.

All fields from creation are required. Use GET first to retrieve current values,
then modify needed fields and send complete object.

Note: Cannot update certificate types that have already been issued.

### Delete certificate type

 - [DELETE /chain/{chain_id}/loyalty/certificate_types/{type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_delete.md): Deletes a certificate type from the chain.

Warning: This action cannot be undone. Certificate types that have
issued certificates cannot be deleted.

### Create a Chain Promotion

 - [POST /chain/{chain_id}/loyalty/programs](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/create_chain_loyalty_program.md)

### Get a Chain Promotion

 - [GET /chain/{chain_id}/loyalty/programs/{loyalty_program_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/get_chain_loyalty_program.md)

### Edit Chain Promotion

 - [PUT /chain/{chain_id}/loyalty/programs/{loyalty_program_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/update_chain_loyalty_program.md)

### Delete Chain Promotion

 - [DELETE /chain/{chain_id}/loyalty/programs/{loyalty_program_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/delete_chain_loyalty_program.md)

### Get a List of Chain Loyalty Transactions

 - [GET /chain/{chain_id}/loyalty/transactions](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/get_chain_loyalty_transaction_list.md)

### Get a list of loyalty notification templates

 - [GET /chain/{chain_id}/loyalty/notification_message_templates/programs](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/get_chain_loyalty_notification_template_list.md)

## Fiscalization

Tax system integration and KKM callbacks

### Get fiscal transactions

 - [GET /kkm_transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/get_fiscal_transaction_list.md): Filters

| Parameter | Description |
| ------------- | ------------- |
| page | Page number |
| editable_length | Number of clients per page |
| type | Operation type |
| status | Operation status |
| start_date | Period start date |
| end_date | Period end date |


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
| 9 | Deposit replenishment |

### Print fiscal receipt

 - [POST /kkm_transactions/{location_id}/print_document_bill](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/print_fiscal_receipt.md): Types of all transactions with location account

| Meaning | Description |
| ------------- | ------------- |
| 0 | Sale operation (active for documents with types "Visit" and "Client account replenishment") |
| 1 | Sale return operation (active for documents with types "Visit" and "Client account replenishment") |
| 2 | Correction operation |
| 4 | Shift opening operation – Opens a new POS shift |
| 5 | Shift closing operation – Closes the current POS shift |
| 9 | Get POS status – Retrieves the current status of the POS device |
| 11 | Get POS team status – Retrieves the status of all POS devices connected to the team |
| 12 | Correction operation |
| 13 | Print X-report – Prints a non-fiscal summary report of the current shift |
| 6 | Cash deposit – Registers a cash-in transaction in the POS |
| 7 | Cash withdrawal – Registers a cash-out transaction in the POS |

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
| 9 | Client account replenishment |

### List request example

 - [GET /integration/kkm/references/tax_system/{country_id}](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/get_tax_system_list.md): A list of tax systems and VAT available for a country can be obtained by requesting the country ID for which the list is to be obtained.
The country ID can be obtained from list of countries.

The list is an array of tax systems with a nested VAT array for each tax system.

The taxation system has the following structure:

| Field | Type | Description |
| -----------------| ---------------- | ----------------------- |
| title | string | Name of taxation system |
| slug | string | Code name for the taxation system |
| vats | Array of objects(Vat[]) | List of available VAT for the taxation system |


VAT has the following structure:

| Field | Type | Description |
| -----------------| ---------------- | ----------------------- |
| title | string | Title VAT |
| slug | string | Code name VAT |

### Example of a request in case of successful fiscalization or in case of an error

 - [POST /integration/kkm/callback](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/handle_fiscalization_callback.md)

### Example of a request for fiscalization of a document

 - [POST /https://your-api.url](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/fiscalize_document.md)

## Utilities

License info, phone validation, images, and tips

### Retrieve location subscription information

 - [GET /license/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/get_location_subscription_information.md)

### Phone number format check

 - [GET /validation/validate_phone/{phone}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/phone_number_format_check.md): The transferred phone number is checked for compliance with Altegio rules.

### Image upload

 - [POST /images/{entity}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/upload_image.md): The response object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| image_binded | boolean | Status of linking images to an entity |
| image_group | object | Image group object |

### Deleting images

 - [DELETE /images/{entity}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/delete_image.md): The response object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| success | boolean | Deletion result |

### Get a list of location team members with their tip settings

 - [GET /tips/{location_id}/settings](https://developer.alteg.io/en/b2b-v1/openapi/utilities/get_team_member_tip_settings.md)

### Disable Tips for the team member

 - [POST /tips/{location_id}/settings/{master_tips_settings_id}/disable](https://developer.alteg.io/en/b2b-v1/openapi/utilities/disable_team_member_tips.md)

### Enable Tips for the team member

 - [GET /tips/{location_id}/settings/{master_tips_settings_id}/enable](https://developer.alteg.io/en/b2b-v1/openapi/utilities/enable_team_member_tips.md)

