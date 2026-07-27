# Search for product transactions

Endpoint: GET /storages/transactions/{location_id}
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

  - `page` (number)
    page number
    Example: 1

  - `count` (number)
    number of transactions per page
    Example: 20

  - `start_date` (string)
    period start date
    Example: "''"

  - `end_date` (string)
    period end date
    Example: "''"

  - `document_id` (string)
    Document ID

  - `changed_after` (string)
    Filtering product transactions modified/created since a specific date and time

  - `changed_before` (string)
    Filtering product transactions modified/created before a specific date and time

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":123456789,"document_id":22256643,"type_id":987654321,"type":"Something","good":{"id":111222333,"title":"Something"},"storage":{"id":333222111,"title":"Storage 1"},"unit":{"id":333222111,"title":"milliliter"},"operation_unit_type":1,"create_date":"2026-12-21T19:08:00-0500","last_change_date":"2026-02-01T12:00:00-0500","cost_per_unit":1.07,"cost":0,"discount":10,"master":{"id":112233445,"title":"James Smith"},"supplier":{"id":11112222,"title":"Best Supplier Ever"},"record_id":1,"service":{"id":1234321,"title":"Service 4"},"clients":{"id":4321234,"name":"George Smith","phone":13155550176}}]

  - `data.id` (number)
    Transaction ID

  - `data.document_id` (number)
    Document ID

  - `data.type_id` (number)
    Transaction type identifier

  - `data.type` (string)
    Transaction type

  - `data.good` (object)
    Product

  - `data.good.id` (number)
    Item ID

  - `data.good.title` (string)
    Product Name

  - `data.storage` (object)
    Inventory

  - `data.storage.id` (number)
    Inventory ID

  - `data.storage.title` (string)
    Inventory name

  - `data.unit` (object)
    Unit of measurement

  - `data.unit.id` (number)
    Unit ID

  - `data.unit.title` (string)
    Unit name

  - `data.operation_unit_type` (number)
    Unit type: 1 - for sale, 2 - for write-off

  - `data.create_date` (string)
    date of creation

  - `data.last_change_date` (string)
    Last modified date

  - `data.cost_per_unit` (number)
    Unit price

  - `data.cost` (number)
    Price

  - `data.discount` (number)
    Discount

  - `data.master` (object)
    team member

  - `data.master.id` (number)
    team member ID

  - `data.master.title` (string)
    team member name

  - `data.supplier` (object)
    The supplier

  - `data.supplier.id` (number)
    Vendor ID

  - `data.supplier.title` (string)
    Supplier name

  - `data.record_id` (number)
    Appointment ID

  - `data.service` (object)
    Service

  - `data.service.id` (number)
    Service ID

  - `data.service.title` (string)
    Service name

  - `data.clients` (object)
    Customer

  - `data.clients.id` (number)
    Client ID

  - `data.clients.name` (string)
    Client name

  - `data.clients.phone` (string)
    Customer phone

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


