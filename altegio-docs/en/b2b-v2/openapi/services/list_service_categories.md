# List Service Categories

Retrieve Service Categories for a Location as JSON:API resource objects.

Use filter[staff_id] to return categories containing Services assigned to
a specific Team Member.

Endpoint: GET /locations/{location_id}/service_categories
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID

## Query parameters:

  - `filter[staff_id]` (integer)
    Filter by Team Member ID

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Service Category ID

  - `data.attributes` (object, required)

  - `data.attributes.title` (string, required)
    Service Category name

  - `data.attributes.salon_service_id` (integer, required)
    Location-specific Service Category link ID

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


