# Get Event Search Filters

Endpoint: GET /activity/{location_id}/filters
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

  - `data` (array)
    Example: [{"code":"service","title":"Services","data":[{"id":1,"title":"Service 1","is_disabled":true},{"id":2,"title":"Service 2","is_disabled":false}]}]

  - `data.code` (string)
    Filter type.
    Enum: "staff", "resource", "service", "service_category"

  - `data.title` (string)
    Filter title.
    Example: "Services"

  - `data.data` (array)
    Filter items.
    Example: [{"id":1,"title":"Service 1","is_disabled":true},{"id":2,"title":"Service 2","is_disabled":false}]

  - `data.data.id` (number)
    Filter item ID.

  - `data.data.title` (string)
    Filter item title.

  - `data.data.is_disabled` (boolean)
    Flag that filter item is disabled for selection (depends on previously applied filters passed as query parameters).

  - `meta` (object)
    Additional response data.

  - `meta.count` (number)
    Response data objects count.
    Example: 10

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


