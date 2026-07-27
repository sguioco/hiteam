# Create product

The method allows you to create a product

Endpoint: POST /goods/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `category_id` (integer, required)
    Product category ID
    Example: 289632

  - `sale_unit_id` (integer, required)
    Sales unit
    Example: 216762

  - `service_unit_id` (integer, required)
    Write-off unit
    Example: 216762

  - `title` (string, required)
    Product Name
    Example: "Shampoo"

  - `print_title` (string)
    Title to be printed on receipt
    Example: "Shampoo"

  - `article` (string)
    vendor code
    Example: "123"

  - `barcode` (string)
    Barcode
    Example: "123"

  - `cost` (number)
    Selling price
    Example: 1000

  - `actual_cost` (number)
    Cost price
    Example: 500

  - `unit_equals` (number)
    The ratio of the unit of measure for sale to the unit of measure for write-off
    Example: 100

  - `critical_amount` (number)
    critical residue
    Example: 1

  - `desired_amount` (number)
    Desired balance
    Example: 1

  - `netto` (number)
    Net weight
    Example: 200

  - `brutto` (number)
    Gross weight
    Example: 250

  - `comment` (string)
    A comment
    Example: "Test comment 123"

  - `tax_variant` (integer)
    Taxation system

  - `vat_id` (integer)
    VAT
    Example: 3

## Response 201 fields (application/json):

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

## Response 422 fields (application/json):

  - `success` (boolean)
    Execution success status

  - `data` (string)
    Contains null

  - `meta` (object)
    Contains an error message
    Example: {"message":"Possible error messages","errors":[{"message":"The specified taxation system is not available for this country."},{"message":"The specified VAT is not available for this taxation system."},{"[title]":["This field is missing."],"[category_id]":["This field is missing."],"[sale_unit_id]":["This field is missing."],"[service_unit_id]":["This field is missing."]}]}

  - `meta.message` (string)
    Example: "Possible error messages"

  - `meta.errors` (array)
    Example: [{"message":"The specified taxation system is not available for this country."},{"message":"The specified VAT is not available for this taxation system."},{"[title]":["This field is missing."],"[category_id]":["This field is missing."],"[sale_unit_id]":["This field is missing."],"[service_unit_id]":["This field is missing."]}]

  - `meta.errors.message` (string)


