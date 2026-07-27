# Get a list of services

Returns a list of all services for the specified location

Endpoint: GET /services/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `staff_id` (number)
    Team member ID, if you want to filter by team member

  - `category_id` (number)
    Category ID, if you want to filter by category

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of services
    Example: [{"id":10279685,"salon_service_id":11486182,"title":"Service name","booking_title":"Service name","category_id":10279684,"price_min":0,"price_max":0,"duration":3600,"discount":0,"comment":"","weight":1,"active":1,"api_id":""}]

  - `data.id` (number)
    Service ID

  - `data.salon_service_id` (number)
    Service ID for a location on the chain

  - `data.title` (string)
    Service name

  - `data.booking_title` (string)
    Service name for booking

  - `data.category_id` (number)
    Identifier of the category in which the service consists

  - `data.price_min` (number)
    Minimum price for the service

  - `data.price_max` (number)
    Maximum price for the service

  - `data.duration` (number)
    Service duration in seconds, default is 3600

  - `data.technical_break_duration` (any)
    Technical break duration in seconds.
- null = use location default
- Value in multiples of 300 (5-minute intervals)

  - `data.discount` (number)
    Discount percentage

  - `data.comment` (string)
    Comment on the service

  - `data.weight` (number)
    Service weight (used to sort categories when displayed)

  - `data.active` (number)
    1 - available for online booking, 0 - not available

  - `data.api_id` (string)
    External Service ID

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


