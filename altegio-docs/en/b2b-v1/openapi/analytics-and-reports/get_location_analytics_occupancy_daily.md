# Get occupancy data by day

Endpoint: GET /company/{location_id}/analytics/overall/charts/fullness_daily
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `location_id` (number, required)
    location ID

## Query parameters:

  - `date_from` (string, required)
    Start date of the analyzed period

  - `date_to` (string, required)
    End date of the analyzed period (included in the report)

  - `team_member_id` (integer)
    ID of the location team member whose work needs to be analyzed

  - `user_id` (integer)
    The user ID of the location whose work you want to analyze

## Response 200 fields (application/json):

  - `label` (string)
    Name of data series
    Example: "Revenue"

  - `data` (array)
    Data for each day. Each day is an array of two numbers. The first number is the timestamp of the beginning of the day in the UTC zone, the second number is the value of the indicator on that day.
    Example: [["2026-09-21T23:00:00.000-05:00",1000],["2026-09-21T23:00:00.000-05:00",500]]

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


