# Get Products

+ term: Name, article or barcode

+ page (number, 1) - Page number (not used if product_id is passed)

+ count (number, 25) - Number of products on the page (not used if product_id is passed)

+ category_id (number, 777) - Id of the product category (not used if product_id is passed)

+ changed_after (string) - filtering products changed/created since a specific date and time (not used if product_id is passed)

+ changed_before (string) - filtering products changed/created before a specific date and time (not used if product_id is passed)

Endpoint: GET /goods/{location_id}/{product_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `product_id` (number, required)
    Product ID (if you need to get a specific product)

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `term` (string)
    name, article number or barcode

  - `page` (number)
    page number
    Example: 1

  - `count` (number)
    number of products per page
    Example: 25

  - `category_id` (number)
    Product category ID

  - `changed_after` (string)
    filtering products modified/created since a specific date and time
    Example: "2026-09-21T23:00:00.000-05:00"

  - `changed_before` (string)
    filtering products modified/created before a specific date and time
    Example: "2026-01-01T12:00:00-0500"

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Product data object
    Example: {"title":"Shampoo 1","value":"Shampoo 1","label":"Shampoo 1 (123)","good_id":123456,"cost":100500,"unit_id":4835,"unit_short_title":"PC","service_unit_id":3548,"service_unit_short_title":"gr","actual_cost":1050,"unit_actual_cost":105,"unit_actual_cost_format":"105 r","unit_equals":10,"barcode":"123","loyalty_abonement_type_id":"150","loyalty_certificate_type_id":"0","loyalty_allow_empty_code":false,"critical_amount":0,"desired_amount":0,"actual_amounts":[{"storage_id":987,"amount":1000000}],"last_change_date":"2026-01-01T12:00:00-0500"}

  - `data.title` (string)
    Name of product
    Example: "Shampoo 1"

  - `data.value` (string)
    Name of product
    Example: "Shampoo 1"

  - `data.label` (string)
    Product name with article number (if any)
    Example: "Shampoo 1 (123)"

  - `data.good_id` (number)
    Product ID
    Example: 123456

  - `data.cost` (number)
    Selling price
    Example: 100500

  - `data.unit_id` (number)
    Sales Unit ID
    Example: 4835

  - `data.unit_short_title` (string)
    Sales unit
    Example: "PC"

  - `data.service_unit_id` (number)
    ID of unit of measure to write off
    Example: 3548

  - `data.service_unit_short_title` (string)
    Write-off unit
    Example: "gr"

  - `data.actual_cost` (number)
    Cost price
    Example: 1050

  - `data.unit_actual_cost` (number)
    Unit cost
    Example: 105

  - `data.unit_actual_cost_format` (string)
    Unit cost format
    Example: "105 r"

  - `data.unit_equals` (number)
    The ratio of the unit of measure for sale to the unit for write-off
    Example: 10

  - `data.barcode` (string)
    Barcode
    Example: "123"

  - `data.loyalty_abonement_type_id` (number)
    Subscription type identifier (if the product is a membership)
    Example: "150"

  - `data.loyalty_certificate_type_id` (number)
    Certificate type identifier (if the item is a certificate)
    Example: "0"

  - `data.loyalty_allow_empty_code` (boolean,number)
    Is it allowed to sell without a code (can be 0/1 or true/false)

  - `data.critical_amount` (number)
    Critical residue

  - `data.desired_amount` (number)
    Desired balance

  - `data.actual_amounts` (array)
    Remaining stock
    Example: [{"storage_id":987,"amount":1000000}]

  - `data.actual_amounts.storage_id` (number)
    Inventory ID

  - `data.actual_amounts.amount` (number)
    Quantity

  - `data.last_change_date` (string)
    The date the entity was last modified
    Example: "2026-01-01T12:00:00-0500"

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


