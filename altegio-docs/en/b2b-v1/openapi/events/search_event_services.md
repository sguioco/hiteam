# Search Event Services

Endpoint: GET /activity/{location_id}/services
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 4564

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `staff_id` (number)
    team member ID to filter

  - `term` (string)
    Search by name or part of the service name

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":1209148,"title":"Fitness test","capacity":5,"price_min":2,"price_max":3,"is_multi":true,"category":{"id":1285356,"title":"Group services"},"staff":[{"id":37695,"name":"Kim Kardashian","length":7200}],"resources":[{"id":464,"title":"massage room","salon_id":4564}]}]

  - `data.id` (number)
    Service ID

  - `data.title` (string)
    Service name

  - `data.capacity` (number)
    Capacity

  - `data.price_min` (number)
    The minimum cost of the service

  - `data.price_max` (number)
    Maximum cost of the service

  - `data.is_multi` (boolean)
    Is the Service available for Events

  - `data.category` (object)
    Service category

  - `data.category.id` (number)
    Category ID

  - `data.category.title` (string)
    Service category name

  - `data.staff` (array)
    team member

  - `data.staff.id` (number)
    team member ID

  - `data.staff.name` (string)
    team member name

  - `data.staff.length` (number)
    Service duration

  - `data.resources` (array)
    Resources

  - `data.resources.id` (number)
    Resource ID

  - `data.resources.title` (string)
    Resource name

  - `data.resources.salon_id` (number)
    Location ID

  - `meta` (object)
    Metadata (contains the number of services found)
    Example: {"count":1}

  - `meta.count` (integer)
    Example: 1

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


