# List Products

Retrieve Products for a Location as JSON:API resource objects.

Pagination uses page and limit. The response includes the effective
page, calculated offset, and limit in meta.pagination.

Related data can be requested by repeating the include parameter. The
actual_cost value is returned only when requested and when the Business
User has permission to view it.

Endpoint: GET /locations/{location_id}/products
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

  - `filter[ids][]` (array)
    Filter by Product IDs

  - `filter[related_loyalty_entity_slug]` (string)
    Filter by Product purpose. Wire values are literal API values:
- common - regular Products
- loyalty_abonement - membership Products
- loyalty_certificate - certificate Products
    Enum: "common", "loyalty_abonement", "loyalty_certificate"

  - `page` (integer)
    Page number

  - `limit` (integer)
    Maximum number of Products to return

  - `include` (array)
    Related resources or conditional attributes to include. Wire values are
literal API keys. Use the Product detail operation for storage_amounts.
    Enum: "loyalty_abonement_type", "loyalty_certificate_type", "mark_settings", "actual_cost"

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Product ID

  - `data.attributes` (object, required)

  - `data.attributes.category_id` (integer, required)
    Product Category ID

  - `data.attributes.title` (string, required)
    Product name

  - `data.attributes.sale_unit_id` (integer, required)
    Sale Unit ID

  - `data.attributes.consumable_unit_id` (integer, required)
    Consumable Unit ID

  - `data.attributes.sale_unit_to_consumable_unit_ratio` (number, required)
    Number of Consumable Units in one Sale Unit

  - `data.attributes.loyalty_abonement_type_id` (integer,null, required)
    Membership type ID, when the Product represents a membership

  - `data.attributes.loyalty_certificate_type_id` (integer,null, required)
    Certificate type ID, when the Product represents a certificate

  - `data.attributes.cost` (number, required)
    Product sale price

  - `data.attributes.actual_cost` (number,null, required)
    Current Product cost when actual_cost is requested and the Business
User has permission to view it; otherwise null.

  - `data.attributes.is_chain` (boolean, required)
    Whether the Product belongs to the Chain catalog

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.loyalty_abonement_type` (object)

  - `data.relationships.loyalty_abonement_type.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `data.relationships.loyalty_certificate_type` (object)

  - `data.relationships.mark_settings` (object)

  - `data.relationships.storage_amounts` (object)

  - `data.relationships.storage_amounts.data` (array, required)

  - `data.relationships.storage_amounts.data.type` (string, required)

  - `data.relationships.storage_amounts.data.id` (string, required)

  - `meta` (object, required)

  - `meta.pagination` (object, required)

  - `meta.pagination.page` (integer, required)

  - `meta.pagination.offset` (integer, required)

  - `meta.pagination.limit` (integer, required)

  - `included` (array)
    Resources requested through include, when available

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


