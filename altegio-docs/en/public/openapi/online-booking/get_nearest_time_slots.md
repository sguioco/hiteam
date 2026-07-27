# Get Nearest Available Time Slots for Team Member

the team member's nearest sessions object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| session_date | string | Next date with available sessions |
| sessions | array | List of available sessions |


The following filters are available:

+ service_ids: Array of service IDs. If you need sessions, when can you book these services
+ datetime: date (in iso8601 format) for which you want to get the next sessions

Endpoint: GET /book_staff_seances/{location_id}/{team_member_id}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `team_member_id` (number, required)
    team member ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

## Query parameters:

  - `service_ids[]` (array)
    Service ID.
Filter by the list of service identifiers

  - `datetime` (number)
    date in iso8601 format.
Filter by date

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"seance_date":"2026-09-21","seances":[{"time":"10:00","seance_length":3600,"sum_length":3600,"datetime":"2026-09-21T10:00:00-05:00"},{"time":"10:15","seance_length":3600,"sum_length":3600,"datetime":"2026-09-21T10:15:00-05:00"},{"time":"10:30","seance_length":3600,"sum_length":3600,"datetime":"2026-09-21T10:30:00-05:00"}]}

  - `data.seance_date` (string)
    Upcoming date with available sessions
    Example: "2026-09-21"

  - `data.seances` (array)
    List of available sessions
    Example: [{"time":"10:00","seance_length":3600,"sum_length":3600,"datetime":"2026-09-21T10:00:00-05:00"},{"time":"10:15","seance_length":3600,"sum_length":3600,"datetime":"2026-09-21T10:15:00-05:00"},{"time":"10:30","seance_length":3600,"sum_length":3600,"datetime":"2026-09-21T10:30:00-05:00"}]

  - `data.seances.time` (string)
    Session time (HH:MM format)

  - `data.seances.seance_length` (number)
    Session duration in seconds

  - `data.seances.sum_length` (number)
    Total duration including all selected services in seconds

  - `data.seances.datetime` (string)
    Session date and time in ISO 8601 format

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


