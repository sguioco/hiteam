# Get the Structure of Appointments by Source

Endpoint: GET /company/{location_id}/analytics/overall/charts/record_source
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
    Name of indicator

  - `data` (integer)
    Indicator value

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


