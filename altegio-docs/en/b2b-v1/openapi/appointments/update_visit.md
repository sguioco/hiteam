# Edit Visit

Endpoint: PUT /visits/{visit_id}/{record_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `visit_id` (number, required)
    Example: 12345

  - `record_id` (number, required)
    Example: 67890

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (*/*):

  - `attendance` (number, required)
    Visit status (2 - The user confirmed the appointment, 1 - The user came, the services were provided, 0 - the user is waiting, -1 - the user did not show)
    Example: 1

  - `comment` (string, required)
    A comment

  - `new_transactions` (array)
    Array of objects of new commodity transactions
    Example: [{"id":12345,"amount":100,"account_id":23322}]

  - `new_transactions.id` (number)
    Financial transaction ID

  - `new_transactions.amount` (number)
    Sum

  - `new_transactions.account_id` (number)
    Checkout ID

  - `deleted_transaction_ids` (array)
    Array of instance IDs
    Example: []

  - `goods_transactions` (array)
    Array of commodity transactions objects
    Example: [{"id":2168657,"title":"Vital Creme Shampoo Plus","barcode":"123","article":"120277","amount":-1,"cost_per_unit":15,"price":15,"cost":12,"operation_unit_type":2,"master_id":55436,"storage_id":91303,"good_id":232658,"discount":20}]

  - `goods_transactions.id` (number)
    Inventory transaction ID

  - `goods_transactions.title` (string)
    Barcode

  - `goods_transactions.barcode` (string)
    Barcode

  - `goods_transactions.article` (string)
    vendor code

  - `goods_transactions.amount` (string)
    Sum

  - `goods_transactions.cost_per_unit` (string)
    Unit price

  - `goods_transactions.price` (string)
    Price

  - `goods_transactions.cost` (string)
    Selling price

  - `goods_transactions.operation_unit_type` (number)
    Unit type: 1 - for sale, 2 - for write-off

  - `goods_transactions.master_id` (string)
    team member ID

  - `goods_transactions.storage_id` (string)
    Inventory ID

  - `goods_transactions.good_id` (string)
    Item ID

  - `goods_transactions.discount` (string)
    Discount

  - `services` (array)
    Array of objects with services
    Example: [{"id":389045,"title":"Hand massage (10 min)","cost":255,"cost_per_unit":300,"discount":15,"first_cost":300,"record_id":10403702}]

  - `services.id` (number)
    Service ID

  - `services.title` (string)
    Service name

  - `services.cost` (number)
    The total cost of the service

  - `services.cost_per_unit` (number)
    Unit price

  - `services.discount` (number)
    Discount

  - `services.first_cost` (number)
    Initial cost of the service

  - `services.record_id` (number)
    Appointment ID

  - `fast_payment` (number)
    Quick payment 1 - cash, 2 - cashless, 129 - cash and print, 130 - cashless and print
    Example: 1

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


## Response 200 fields
