# Transaction update

Endpoint: PUT /storage_operations/goods_transactions/{location_id}/{transaction_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `transaction_id` (number, required)
    transaction ID

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

## Request fields (*/*):

  - `amount` (number, required)
    Quantity
    Example: 1

  - `cost` (number, required)
    Total transaction amount
    Example: 90

  - `cost_per_unit` (number, required)
    Unit cost
    Example: 100

  - `discount` (number, required)
    Discount in %
    Example: 10

  - `document_id` (number, required)
    Document ID
    Example: 22254960

  - `good_id` (number, required)
    Item ID
    Example: 232674

  - `operation_unit_type` (number, required)
    unit type: 1 - for sale, 2 - for write-off
    Example: 1

  - `master_id` (number)
    ID of the team member who sold the product
    Example: 26781

  - `client_id` (number)
    ID of the customer who bought the product

  - `supplier_id` (number)
    Vendor ID

  - `comment` (string)
    A comment
    Example: "Transaction comment"

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":3428010,"document_id":22254960,"type_id":1,"type":{"id":1,"title":"Sale of goods"},"company_id":4564,"good_id":232674,"amount":-1,"cost_per_unit":100,"discount":10,"cost":90,"unit_id":1,"storage_id":36539,"supplier_id":0,"client_id":0,"master_id":26781,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"Transaction comment","deleted":false,"good":{"id":232674,"title":"Edition De Luxe","unit":"PC.","value":"delete yy","label":"delete yy","article":"","category":"goose category","category_id":303603,"salon_id":91372,"good_id":15086312,"cost":500,"unit_id":216760,"unit_short_title":"PC","service_unit_id":216760,"service_unit_short_title":"PC","actual_cost":0,"unit_actual_cost":0,"unit_actual_cost_format":"0 USD","unit_equals":1,"barcode":"","loyalty_abonement_type_id":"0","loyalty_certificate_type_id":"0","loyalty_allow_empty_code":true,"actual_amounts":[],"last_change_date":"2026-03-05T18:21:34-0500"},"storage":{"id":36539,"title":"Products"},"sale_unit":null,"service_unit":null,"supplier":[],"client":[],"master":{"id":26781,"name":"Angelina Jolie"},"unit":{"id":1,"title":"Thing","short_title":"PC."}}

  - `data.id` (integer)
    Example: 3428010

  - `data.document_id` (integer)
    Example: 22254960

  - `data.type_id` (integer)
    Example: 1

  - `data.type` (object)
    Transaction type
    Example: {"id":1,"title":"Sale of goods"}

  - `data.type.id` (number)
    Transaction type ID
    Example: 1

  - `data.type.title` (string)
    Transaction type name
    Example: "Sale of goods"

  - `data.company_id` (number)
    location ID
    Example: 4564

  - `data.good_id` (number)
    Product ID
    Example: 232674

  - `data.amount` (number)
    Quantity
    Example: -1

  - `data.cost_per_unit` (number)
    Unit price
    Example: 100

  - `data.cost` (number)
    Price
    Example: 90

  - `data.discount` (number)
    Discount
    Example: 10

  - `data.unit_id` (number)
    Unit ID
    Example: 1

  - `data.storage_id` (number)
    Inventory ID
    Example: 36539

  - `data.supplier_id` (number)
    Vendor ID

  - `data.client_id` (number)
    Client ID

  - `data.master_id` (number)
    team member ID
    Example: 26781

  - `data.create_date` (string)
    date of creation
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.last_change_date` (string)
    Last modified date

  - `data.comment` (string)
    A comment
    Example: "Transaction comment"

  - `data.deleted` (boolean)
    Delete transaction flag

  - `data.good_special_number` (string)
    Special number (e.g., certificate code)

  - `data.service_amount` (number)
    Service quantity

  - `data.sale_amount` (number)
    Sale quantity

  - `data.service_unit_id` (number)
    Service unit ID

  - `data.sale_unit_id` (number)
    Sale unit ID

  - `data.operation_unit_type` (number)
    Operation unit type

  - `data.good` (object)
    Product
    Example: {"id":232674,"title":"Edition De Luxe","unit":"PC.","value":"delete yy","label":"delete yy","article":"","category":"goose category","category_id":303603,"salon_id":91372,"good_id":15086312,"cost":500,"unit_id":216760,"unit_short_title":"PC","service_unit_id":216760,"service_unit_short_title":"PC","actual_cost":0,"unit_actual_cost":0,"unit_actual_cost_format":"0 USD","unit_equals":1,"barcode":"","loyalty_abonement_type_id":"0","loyalty_certificate_type_id":"0","loyalty_allow_empty_code":true,"actual_amounts":[],"last_change_date":"2026-03-05T18:21:34-0500"}

  - `data.good.id` (number)
    Product ID
    Example: 232674

  - `data.good.title` (string)
    Product Name
    Example: "Edition De Luxe"

  - `data.good.unit` (string)
    unit of measurement
    Example: "PC."

  - `data.good.value` (string)
    Product Name
    Example: "delete yy"

  - `data.good.label` (string)
    Product Name
    Example: "delete yy"

  - `data.good.article` (string)
    vendor code

  - `data.good.category` (string)
    Product category name
    Example: "goose category"

  - `data.good.category_id` (number)
    Product category ID
    Example: 303603

  - `data.good.salon_id` (number)
    location ID
    Example: 91372

  - `data.good.good_id` (number)
    Product ID
    Example: 15086312

  - `data.good.cost` (number)
    Price
    Example: 500

  - `data.good.unit_id` (number)
    Unit ID
    Example: 216760

  - `data.good.unit_short_title` (string)
    Abbreviated name of the unit of measurement
    Example: "PC"

  - `data.good.service_unit_id` (number)
    Unit ID for the service
    Example: 216760

  - `data.good.service_unit_short_title` (string)
    Abbreviated name of the unit of measure for the service
    Example: "PC"

  - `data.good.actual_cost` (number)
    Cost price

  - `data.good.unit_actual_cost` (number)
    unit cost

  - `data.good.unit_actual_cost_format` (string)
    Unit cost format
    Example: "0 USD"

  - `data.good.unit_equals` (number)
    Unit value
    Example: 1

  - `data.good.barcode` (string)
    Barcode

  - `data.good.loyalty_abonement_type_id` (number)
    Membership ID (if the product is a membership)
    Example: "0"

  - `data.good.loyalty_certificate_type_id` (number)
    Certificate identifier (if the product is a certificate)
    Example: "0"

  - `data.good.loyalty_allow_empty_code` (number)
    Is it allowed to sell without a code
    Example: true

  - `data.good.actual_amounts` (array)
    Quantity of products
    Example: []

  - `data.good.last_change_date` (string)
    Date of last product change
    Example: "2026-03-05T18:21:34-0500"

  - `data.good.comment` (string)
    Product comment

  - `data.good.loyalty_certificate_type` (object,null)
    Certificate type details (if product is certificate)

  - `data.good.loyalty_serial_number_limited` (number)
    Serial number limit flag

  - `data.good.is_goods_mark_enabled` (boolean)
    Whether products marking is enabled

  - `data.good.critical_amount` (number)
    Critical stock amount threshold

  - `data.good.desired_amount` (number)
    Desired stock amount

  - `data.good.is_chain` (boolean)
    Whether product belongs to chain

  - `data.sale_unit` (any)
    Sales unit (can be object or null)
    - `id` (number)
    - `company_id` (number)
    - `title` (string)
    - `short_title` (string)

  - `data.service_unit` (any)
    Sales unit for service (can be object or null)
    - `id` (number)
    - `company_id` (number)
    - `title` (string)
    - `short_title` (string)

  - `data.goods_marks` (array)
    Product marking codes

  - `data.storage` (object)
    Inventory
    Example: {"id":36539,"title":"Products"}

  - `data.storage.id` (number)
    Inventory ID
    Example: 36539

  - `data.storage.title` (string)
    Inventory name
    Example: "Products"

  - `data.supplier` (array)
    The supplier
    Example: []

  - `data.client` (any)
    Customer (can be array or object)
    Example: []
    - `id` (number)
    - `name` (string)
    - `phone` (string)
    - `email` (string)

  - `data.master` (any)
    Team Member (can be array or object)
    Example: {"id":26781,"name":"Angelina Jolie"}
    - `id` (number)
      team member ID
      Example: 26781
    - `name` (string)
      Team Member name
      Example: "Angelina Jolie"

  - `data.unit` (object)
    unit of measurement
    Example: {"id":1,"title":"Thing","short_title":"PC."}

  - `data.unit.id` (number)
    Unit ID
    Example: 1

  - `data.unit.company_id` (number)
    Location ID

  - `data.unit.title` (string)
    Unit name
    Example: "Thing"

  - `data.unit.short_title` (string)
    Abbreviated name of the unit of measurement
    Example: "PC."

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


