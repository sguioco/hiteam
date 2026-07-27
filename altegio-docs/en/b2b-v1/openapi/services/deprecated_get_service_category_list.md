# Deprecated. Get a list of service categories (deprecated)

Get a list of service categories

Endpoint: GET /service_categories/{location_id}/{id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `id` (number, required)
    Service category identifier

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects
    Example: [{"id":345,"salon_service_id":353,"title":"Haircuts for men","api_id":"adw322","weight":10,"staff":[5006,8901,26514,26516,26519,26520]},{"id":3456,"salon_service_id":3252,"title":"Haircuts for women","api_id":"adw323","weight":9,"staff":[5006,8901]}]

  - `data.id` (number)
    Category ID

  - `data.salon_service_id` (number)
    Category ID for the location on the chain

  - `data.title` (string)
    name of category

  - `data.api_id` (string)
    External Category ID

  - `data.weight` (number)
    Category weight (used to sort categories when displayed)

  - `data.staff` (array)
    List of team member IDs providing the service

  - `data.is_chain` (boolean)
    Whether category belongs to chain

  - `meta` (any)
    Metadata (object with total_count or empty array)
    Example: {"total_count":2}
    - `total_count` (number)
      Number of categories found
      Example: 2

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


