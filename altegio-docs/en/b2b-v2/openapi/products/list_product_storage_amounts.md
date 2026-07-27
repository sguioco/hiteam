# List Product Storage Amounts

Retrieve Product amounts across the Location's Storages as JSON:API
resource objects. Amounts are returned in both Sale Units and Consumable
Units.

Endpoint: GET /locations/{location_id}/products/{product_id}/storage_amounts
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

  - `product_id` (integer, required)
    Product ID

## Query parameters:

  - `include` (array)
    Include Storage details; storage is the literal wire value
    Enum: "storage"

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Composite Product and Storage ID

  - `data.attributes` (object, required)

  - `data.attributes.good_id` (integer, required)
    Product ID

  - `data.attributes.storage_id` (integer, required)
    Storage ID

  - `data.attributes.sale_amount` (number, required)
    Available amount measured in Sale Units

  - `data.attributes.consumable_amount` (number, required)
    Available amount measured in Consumable Units

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.storage` (object)

  - `data.relationships.storage.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `included` (array)
    Storage resources requested through include

  - `included.type` (string, required)

  - `included.id` (string, required)

  - `included.attributes` (object, required)

  - `included.relationships` (object)

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


