# Create a service category

Endpoint: POST /service_categories/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Path parameters:

  - `location_id` (number, required)
    location ID

## Request fields (application/json):

  - `title` (string)
    Service category name
    Example: "Haircut very feminine"

  - `api_id` (string)
    External Category ID
    Example: "adw322"

  - `weight` (number)
    Category weight (used to sort categories when displayed)
    Example: 111

  - `staff` (array)
    List of IDs of team members providing services from the category
    Example: [5006,8901]

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":3,"salon_service_id":15,"title":"Haircut very feminine","api_id":"adw322","weight":111,"staff":[5006,8901]}

  - `data.id` (number)
    Category ID
    Example: 3

  - `data.salon_service_id` (number)
    Category ID for the location on the chain
    Example: 15

  - `data.title` (string)
    name of category
    Example: "Haircut very feminine"

  - `data.api_id` (string)
    External Category ID
    Example: "adw322"

  - `data.weight` (number)
    Category weight (used to sort categories when displayed)
    Example: 111

  - `data.staff` (array)
    List of team member IDs providing the service from the category
    Example: [5006,8901]

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


