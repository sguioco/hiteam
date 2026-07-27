# Get Event Date Range

Endpoint: GET /activity/{location_id}/search_dates_range
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

  - `service_ids` (array)
    Filter by services IDs.
    Example: [123]

  - `staff_ids` (array)
    Filter by team member IDs.
    Example: [456]

  - `resource_ids` (array)
    Filter by resources IDs.
    Example: [789]

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Date range for Event search.

  - `data.min_date` (string,null)
    Start date (YYYY-MM-DD).

  - `data.max_date` (string,null)
    End date (YYYY-MM-DD).

  - `meta` (object,array)
    Additional response data (empty object or empty array)

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


