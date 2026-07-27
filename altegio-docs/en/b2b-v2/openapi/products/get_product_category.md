# Get Product Category

Retrieve a Product Category for a Location as a JSON:API resource object.

Endpoint: GET /locations/{location_id}/product_categories/{product_category_id}
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

  - `product_category_id` (integer, required)
    Product Category ID

## Query parameters:

  - `include` (array)
    Related resources to include. child_categories and goods are
literal wire values for Product Categories and Products.
    Enum: "child_categories", "goods"

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Product Category ID

  - `data.attributes` (object, required)

  - `data.attributes.title` (string, required)
    Product Category name

  - `data.attributes.is_chain` (boolean, required)
    Whether the Product Category belongs to the Chain catalog

  - `data.attributes.parent_category_id` (integer,null, required)
    Parent Product Category ID; null for a root category

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.child_categories` (object)

  - `data.relationships.child_categories.data` (array, required)

  - `data.relationships.child_categories.data.type` (string, required)

  - `data.relationships.child_categories.data.id` (string, required)

  - `data.relationships.goods` (object)

  - `meta` (array, required)

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


