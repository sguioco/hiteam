# Deprecated. Get location users (deprecated)

location User object

Endpoint: GET /company_users/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":224348,"firstname":"James","login":"j.smith","email":"j.smith@example.com","phone":"+13155550175","information":"Test user","access":{"stat_access":true,"schedule_edit_access":false,"client_phones_access":false,"clients_access":false,"settings_access":false,"edit_records_access":false,"timetable_access":true,"billing_access":false,"users_access":false,"excel_access":false,"finances_access":false,"storages_access":false,"send_sms":true,"master_id":0}},{"id":11,"firstname":"James","login":"j.smith","email":"j.smith@example.com","phone":"+13155550175","information":"Test user","access":{"stat_access":true,"schedule_edit_access":true,"client_phones_access":true,"clients_access":true,"settings_access":true,"edit_records_access":true,"timetable_access":true,"billing_access":true,"users_access":false,"excel_access":true,"finances_access":true,"storages_access":true,"send_sms":true,"master_id":0}}]

  - `data.id` (number)
    User ID

  - `data.firstname` (string)
    Username

  - `data.login` (string)
    user login for authorization in the system (for authorization, you can also use the phone and email fields as a login)

  - `data.email` (string)
    User mailing address

  - `data.phone` (string)
    User phone

  - `data.information` (string)
    User information

  - `data.access` (object)
    Object of user access rights to system modules

  - `data.access.stat_access` (boolean)
    true - there is access to analytics, false - no access

  - `data.access.schedule_edit_access` (boolean)
    true - there is access to the team member's work schedule in the log, false - no access

  - `data.access.client_phones_access` (boolean)
    true - there is access to phone numbers in the list of clients, false - no access

  - `data.access.clients_access` (boolean)
    true - there is access to the client base, false - no access

  - `data.access.settings_access` (boolean)
    true - there is access to the settings section, false - no access

  - `data.access.edit_records_access` (boolean)
    true - there is access to change records, false - no access

  - `data.access.timetable_access` (boolean)
    true - there is access to the appointment log, false - no access

  - `data.access.billing_access` (boolean)
    true - there is access to billing (balance menu section), false - no access

  - `data.access.users_access` (boolean)
    true - there is access to user management, false - no access

  - `data.access.excel_access` (boolean)
    1 - there is access to unloading the list of clients in Excel, 0 - no access

  - `data.access.finances_access` (boolean)
    true - there is access to finances, false - no access

  - `data.access.storages_access` (boolean)
    true - there is access to the inventory, false - no access

  - `data.access.send_sms` (boolean)
    true - there is access to SMS distribution to clients, false - no access

  - `data.access.master_id` (number)
    0 - if the user can view the schedule and records of all team members, otherwise only the team member whose ID is specified

  - `meta` (array)
    Metadata (empty array)
    Example: []

## Response 401 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Authentication needed."

## Response 403 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Access denied."

## Response 404 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object,array)
    Additional response data (empty object or empty array)


