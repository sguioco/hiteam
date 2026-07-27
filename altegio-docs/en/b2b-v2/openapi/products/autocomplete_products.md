# Autocomplete Products

Search Products by name, article number, or barcode.

The search term must contain at least two characters and cannot contain
emoji. Pagination uses page and limit and is returned in
meta.pagination.

Endpoint: GET /locations/{location_id}/products/autocomplete
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

  - `filter[term]` (string, required)
    Product name, article number, or barcode search term

  - `page` (integer)
    Page number

  - `limit` (integer)
    Maximum number of Products to return

  - `include` (array)
    Related resources to include; wire values are literal API keys
    Enum: "loyalty_abonement_type", "loyalty_certificate_type", "mark_settings"

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

## Response 400 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


