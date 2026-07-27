# Change schedule of a specific team member

Endpoint: PUT /schedule/{location_id}/{team_member_id}/{start_date}/{end_date}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `team_member_id` (number, required)
    team member ID

  - `start_date` (string, required)
    Start date (YYYY-MM-DD)

  - `end_date` (string, required)
    End date (YYYY-MM-DD)

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (*/*):

  - `date` (string, required)
    date

  - `is_working` (boolean, required)
    Working date or not

  - `slots` (object, required)
    Array of (from, to) working hours

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


## Response 201 fields
