# Get Dates Available for Booking

The dates available for booking object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| working_days | array of working days grouped by month | Working days of a team member/organization |
| working_dates | array of dates | An array of dates when the team member/organization works |
| booking_days | array of days when there are free sessions | Array of days that are available for booking for the specified services |
| booking_dates | array of dates | An array of dates when there are free sessions for the service to the selected team member/organization |

working days and booking_days have the same format:
month:[array of days in this month]

For example, this booking_days:
        "9": [
              "4",
              "5"]
        "10": [
              "14",
              "25"]
Means that on September 4 and 5, and on October 14 and 25 there are free sessions for booking


The following filters are available:

+ service_ids: Array of service IDs. If you need dates when you can book the specified services
+ staff_id: team member ID. If you need dates when you can book the specified team member
+ date: Date within a month, if you need dates for a specific month

Endpoint: GET /book_dates/{location_id}
Version: 1.0.0
Security: BearerPartner

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
    Bearer partner_token

## Query parameters:

  - `service_ids[]` (string)
    Service ID.
Filter by the list of service identifiers

  - `staff_id` (number)
    team member ID. Filter by team member ID
Default: 0

  - `date` (string)
    date in iso8601 format.
Filter by month of booking.
    Example: "2026-09-01"

  - `date_from` (string)
    date in iso8601 format.
Start of dates to search.
Must be used together with the "date_to" param and overrides the "date" param.
    Example: "2026-09-01"

  - `date_to` (string)
    date in iso8601 format.
End of dates to search.
Must be used together with the "date_from" param and overrides the "date" param.
    Example: "2026-09-30"

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Data (object)
    Example: {"booking_days":{"1":[10],"12":[6,20,24,27]},"booking_dates":["2026-12-06","2026-12-20","2026-12-24","2026-12-27","2026-01-10"],"working_days":{"1":[10],"12":[4,6,8,13,15,20,22,24,27,29]},"working_dates":["2026-12-04","2026-12-06","2026-12-08","2026-12-13","2026-12-15"]}

  - `data.booking_days` (any)
    Object with month numbers as keys and arrays of available days as values (empty array when no data)
    Example: {"1":[10],"12":[6,20,24,27]}

  - `data.booking_dates` (array)
    An array of dates when there are free sessions for the service to the selected team member/organization
    Example: ["2026-12-06","2026-12-20","2026-12-24","2026-12-27","2026-01-10"]

  - `data.working_days` (any)
    Object with month numbers as keys and arrays of working days as values (empty array when no data)
    Example: {"1":[10],"12":[4,6,8,13,15,20,22,24,27,29]}

  - `data.working_dates` (array)
    An array of dates when the team member/organization works
    Example: ["2026-12-04","2026-12-06","2026-12-08","2026-12-13","2026-12-15"]

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


