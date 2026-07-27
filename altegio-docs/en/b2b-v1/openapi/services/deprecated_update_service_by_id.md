# Update a service

Method to update a service by ID

Endpoint: PUT /services/{location_id}/{service_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `service_id` (number, required)
    Service ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `title` (string)
    Service name
    Example: "Men's haircut"

  - `category_id` (number)
    Service Category ID
    Example: 83167

  - `price_min` (number)
    The minimum cost of the service
    Example: 1300

  - `price_max` (number)
    Maximum cost of the service
    Example: 1300

  - `duration` (number)
    Service duration, default is 3600 seconds
    Example: 3600

  - `technical_break_duration` (any)
    Technical break duration in seconds.
- If not provided, defaults to null
- null = use location default (Settings → Appointment Log → Technical Breaks)
- Must be in multiples of 300 (5-minute intervals)
- Maximum value is 3600 (1 hour)

  - `discount` (number)
    Service discount

  - `comment` (string)
    Comment on the service

  - `weight` (number)
    Service weight (used to sort services when displayed)
    Example: 6

  - `active` (number)
    Is the service available for online booking? 1 - available, 0 not available.
    Example: 1

  - `api_id` (string)
    External Service ID
    Example: "00000000042"

  - `staff` (array)
    team members who provide the service, along with the duration of the service for each team member
    Example: [{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600},{"id":8973,"seance_length":3600},{"id":13616,"seance_length":3600},{"id":16681,"seance_length":3600},{"id":1796,"seance_length":3600},{"id":34006,"seance_length":3600}]

  - `staff.id` (number)
    team member ID

  - `staff.seance_length` (number)
    The duration of the service (in multiples of 15 minutes)

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":83169,"salon_service_id":322888,"title":"Men's haircut","category_id":83167,"price_min":1300,"price_max":1300,"duration":3600,"discount":0,"comment":"","weight":6,"active":1,"api_id":"00000000042","staff":[{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600},{"id":8973,"seance_length":3600},{"id":13616,"seance_length":3600},{"id":16681,"seance_length":3600},{"id":1796,"seance_length":3600},{"id":34006,"seance_length":3600}]}

  - `data.id` (number)
    Service ID
    Example: 83169

  - `data.salon_service_id` (number)
    Service ID for a location on the chain
    Example: 322888

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

  - `data.duration` (number)
    Service duration, default is 3600 seconds
    Example: 3600

  - `data.technical_break_duration` (any)
    Technical break duration in seconds.
- null = use location default (Settings → Appointment Log → Technical Breaks)
- Value in multiples of 300 (5-minute intervals)
- Maximum value is 3600 (1 hour)

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
    Example: [{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600},{"id":8973,"seance_length":3600},{"id":13616,"seance_length":3600},{"id":16681,"seance_length":3600},{"id":1796,"seance_length":3600},{"id":34006,"seance_length":3600}]

  - `data.staff.id` (number)
    team member ID

  - `data.staff.seance_length` (number)
    Service duration (multiple of 15 minutes)

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


