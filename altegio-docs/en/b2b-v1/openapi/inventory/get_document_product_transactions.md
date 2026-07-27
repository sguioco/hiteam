# Get Product Transactions of a Document

Endpoint: GET /storage_operations/documents/goods_transactions/{document_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `document_id` (number, required)
    Document ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":3728232,"document_id":22256643,"type_id":1,"company_id":4564,"good_id":587018,"amount":-10,"cost_per_unit":100,"discount":0,"cost":1000,"unit_id":88272,"operation_unit_type":1,"storage_id":36539,"supplier_id":0,"record_id":0,"client_id":0,"master_id":49754,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"","service_id":0,"user_id":3,"deleted":false,"pkg_amount":0},{"id":3728233,"document_id":22256643,"type_id":1,"company_id":4564,"good_id":232674,"amount":-10,"cost_per_unit":127.5,"discount":0,"cost":1275,"unit_id":1,"operation_unit_type":2,"storage_id":36539,"supplier_id":0,"record_id":0,"client_id":0,"master_id":49754,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"","service_id":0,"user_id":3,"deleted":false,"pkg_amount":0}]

  - `data.id` (number)
    Transaction ID

  - `data.document_id` (number)
    Document ID

  - `data.type_id` (number)
    Transaction type identifier

  - `data.company_id` (number)
    location ID

  - `data.good_id` (number)
    Item ID

  - `data.amount` (number)
    Quantity of products

  - `data.cost_per_unit` (number)
    Unit price

  - `data.discount` (number)
    Discount

  - `data.cost` (number)
    The total cost of the products

  - `data.unit_id` (number)
    Unit ID

  - `data.operation_unit_type` (number)
    Unit type: 1 - for sale, 2 - for write-off

  - `data.storage_id` (number)
    Inventory ID

  - `data.supplier_id` (number)
    Vendor ID

  - `data.record_id` (number)
    Appointment ID

  - `data.client_id` (number)
    Client ID

  - `data.master_id` (number)
    team member ID

  - `data.create_date` (string)
    date of creation

  - `data.comment` (string)
    A comment

  - `data.service_id` (number)
    Service ID

  - `data.user_id` (number)
    User ID

  - `data.deleted` (boolean)
    Has the transaction been deleted?

  - `data.pkg_amount` (number)
    Amount in a package

  - `meta` (object)
    Metadata (number of transactions found)
    Example: {"count":2}

  - `meta.count` (integer)
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


