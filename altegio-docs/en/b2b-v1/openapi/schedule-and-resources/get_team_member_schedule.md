# Get schedule of a specific team member

Endpoint: GET /schedule/{location_id}/{team_member_id}/{start_date}/{end_date}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `team_member_id` (number, required)
    team member ID.

  - `start_date` (number, required)
    Period start date
    Example: 20251201

  - `end_date` (number, required)
    Period end date
    Example: 20251231

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `date` (string, required)
    date in iso8601 format.

  - `is_working` (boolean, required)
    Free time or not.

  - `slots` (array)
    An array of (from, to) working timeslots.

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


