# Get a list of sessions for the Appointment Calendar

The sessions object for the log has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| time | string | Session time (17:30 for example) |
| free | boolean | Free time or busy |

Endpoint: GET /timetable/seances/{location_id}/{team_member_id}/{date}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `date` (string, required)
    date in iso8601 format.
Filter by appointment date (eg '2026-09-30')

  - `team_member_id` (number, required)
    team member ID.

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `is_free` (boolean, required)
    free time or not

  - `time` (string, required)
    Session time

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


