# Get a List of Partner Appointments

#### Filtering appointments

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

Endpoint: GET /records/partner
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `page` (number)
    Page number
    Example: 1

  - `editable_length` (number)
    Number of appointments per page, maximum 100
    Example: 50

  - `salon_id` (number)
    Location ID
    Example: 1

  - `start_date` (string)
    Filter by visit date from
    Example: "'17.01.2025'"

  - `end_date` (string)
    Filter by visit date by
    Example: "'17.01.2025'"

  - `created_start_date` (string)
    Filter by appointment creation date from
    Example: "'17.01.2025'"

  - `created_end_date` (string)
    Filter by appointment creation date by
    Example: "'17.01.2025'"

  - `user_id` (number)
    User ID
    Example: 1

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


## Response 200 fields
