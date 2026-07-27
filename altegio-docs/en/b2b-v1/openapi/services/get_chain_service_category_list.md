# Get a list of chain service categories

Endpoint: GET /chain/{chain_id}/service_categories
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `include` (string)
    Include additional resources in response
    Enum: "services"

## Response 200 fields (application/json):

  - `id` (integer)
    Service Category ID
    Example: 41

  - `title` (string)
    Service category name
    Example: "Service category"

  - `services` (array)
    Services in the category (on request)
    Example: [{"id":52,"title":"Service 1"},{"id":45,"title":"Service 2"}]

  - `services.id` (integer)
    Service ID
    Example: 123456

  - `services.title` (string)
    Service name
    Example: "Service name"

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


