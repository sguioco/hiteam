# Get a list of product categories by ID

Endpoint: GET /goods_categories/multiple/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `location_id` (number)
    Product category ID (you can specify several additional parameters &ids[]={id}

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":1035384,"title":"Memberships","parent_category_id":null,"is_chain":true},{"id":961078,"title":"Basic products","parent_category_id":null,"is_chain":false}]

  - `data.id` (integer)
    Product category ID

  - `data.title` (string)
    Product category name

  - `data.parent_category_id` (integer,null)
    Parent category ID (null for top-level categories)

  - `data.is_chain` (boolean)
    Whether the category belongs to the chain

  - `meta` (object)
    Metadata
    Example: {"count":2}

  - `meta.count` (integer)
    Total number of categories
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


