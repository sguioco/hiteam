# Get a list of products

Returns a list of all products for the specified location

Endpoint: GET /goods/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of products
    Example: [{"title":"Shampoo 1","value":"Shampoo 1","label":"Shampoo 1 (123)","good_id":123456,"cost":100500,"unit_id":4835,"unit_short_title":"PC"}]

  - `data.title` (string)
    Product title

  - `data.value` (string)
    Product value (usually same as title)

  - `data.label` (string)
    Product label for display

  - `data.article` (string)
    Product article/SKU

  - `data.category` (string)
    Category name

  - `data.category_id` (number)
    Category ID

  - `data.salon_id` (number)
    Location ID

  - `data.good_id` (number)
    Product ID

  - `data.cost` (number)
    Product cost

  - `data.unit_id` (number)
    Unit ID

  - `data.unit_short_title` (string)
    Unit short title (e.g. pc, gr)

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


