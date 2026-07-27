# Search Event Dates

Endpoint: GET /activity/{location_id}/search_dates
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

## Query parameters:

  - `from` (string, required)
    Search start date (YYYY-MM-DD format).
    Example: "2026-06-01"

  - `till` (string, required)
    Search end date (YYYY-MM-DD format).
    Example: "2026-07-15"

  - `service_ids` (array)
    Filter by services IDs.
    Example: [123]

  - `staff_ids` (array)
    Filter by team member IDs.
    Example: [456]

  - `resource_ids` (array)
    Filter by resources IDs.
    Example: [789]

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
