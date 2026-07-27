# Deprecated. Get a list of services / specific service (deprecated)

Endpoint: GET /services/{location_id}/{service_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `service_id` (number, required)
    Service ID, if you need to work with a specific service.

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Query parameters:

  - `staff_id` (number)
    team member ID, if you want to filter by team member

  - `category_id` (number)
    Category ID, if you want to filter by category

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Service data object
    Example: {"id":83169,"salon_service_id":433222,"title":"Men's haircut","category_id":83167,"price_min":1300,"price_max":1300,"discount":0,"comment":"","weight":6,"active":1,"api_id":"00000000042","staff":[{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600}],"duration":3600,"is_online":true}

  - `data.id` (number)
    Service ID
    Example: 83169

  - `data.salon_service_id` (number)
    Service ID for a location on the chain
    Example: 433222

  - `data.title` (string)
    Service name
    Example: "Men's haircut"

  - `data.category_id` (number)
    Identifier of the category in which the service consists
    Example: 83167

  - `data.price_min` (number)
    Minimum price for the service
    Example: 1300

  - `data.price_max` (number)
    Maximum price for the service
    Example: 1300

  - `data.discount` (number)
    Discount

  - `data.comment` (string)
    Comment on the service

  - `data.weight` (number)
    Service weight (used to sort categories when displayed)
    Example: 6

  - `data.active` (number)
    1 - available for online booking, 0 - not available
    Example: 1

  - `data.api_id` (string)
    External Service ID
    Example: "00000000042"

  - `data.staff` (array)
    List of team members providing the service and session duration
    Example: [{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600}]

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


