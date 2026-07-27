# Get a List of Time Slots Available for Booking

The sessions available for booking object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| time | string | Session time (17:30 for example) |
| session_length | number | Session duration in seconds |
| datetime | datetime | Date and time of the session in ISO8601 format (must be passed when creating the appointment) |


The following filters are available:

+ service_ids: Array of service IDs. If you need sessions, when can you book these services

Endpoint: GET /book_times/{location_id}/{team_member_id}/{date}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `date` (string, required)
    date in iso8601 format.
Filter by booking date (eg '2026-09-30')

  - `team_member_id` (number, required)
    team member ID. Filter by team member ID
Default: 0

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Query parameters:

  - `service_ids[]` (string)
    Service ID.
Filter by the list of service identifiers

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"time":"12:00","seance_length":3600,"datetime":"2026-09-21T23:00:00.000-05:00"},{"time":"13:00","seance_length":3600,"datetime":"2026-09-21T23:00:00.000-05:00"},{"time":"14:00","seance_length":3600,"datetime":"2026-09-21T23:00:00.000-05:00"},{"time":"15:00","seance_length":3600,"datetime":"2026-09-21T23:00:00.000-05:00"},{"time":"16:00","seance_length":3600,"datetime":"2026-09-21T23:00:00.000-05:00"}]

  - `data.time` (string)
    Session time (HH:MM format)

  - `data.seance_length` (number)
    Session duration in seconds

  - `data.sum_length` (number)
    Total duration including all selected services in seconds

  - `data.datetime` (string)
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


