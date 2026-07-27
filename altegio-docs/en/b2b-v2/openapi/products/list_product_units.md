# List Product Units

Retrieve the measurement Units available to Products in a Location as
JSON:API resource objects. The collection contains shared system Units and
any Units configured specifically for the Location.

Use Unit IDs as sale_unit_id and consumable_unit_id in Product data.

Endpoint: GET /locations/{location_id}/units
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

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Product Unit ID

  - `data.attributes` (object, required)

  - `data.attributes.company_id` (integer, required)
    Location ID for a custom Unit; 0 for a shared system Unit

  - `data.attributes.title` (string, required)
    Full Unit name

  - `data.attributes.short_title` (string, required)
    Abbreviated Unit name

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


