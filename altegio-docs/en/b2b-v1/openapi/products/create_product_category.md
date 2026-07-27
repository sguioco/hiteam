# Create a Product Category

The method allows you to create a product category.

Endpoint: POST /goods_categories/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `title` (string, required)
    Product category name
    Example: "Manicure"

  - `parent_category_id` (integer)
    Parent category ID (optional, but can be 0 or null if you don't need to specify the parent category)
    Example: 123456

  - `article` (string)
    vendor code
    Example: "123article"

  - `comment` (string)
    A comment
    Example: "Category of products for manicure"

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":123456,"title":"Manicure","parent_category_id":123457}

  - `data.id` (integer)
    Product category ID
    Example: 123456

  - `data.title` (string)
    Product category name
    Example: "Manicure"

  - `data.parent_category_id` (integer)
    Identifier of the parent product category (may be null if there is no parent product category)
    Example: 123457

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


