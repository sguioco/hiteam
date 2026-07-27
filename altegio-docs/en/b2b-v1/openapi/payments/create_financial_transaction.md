# Create a Financial Transaction

Endpoint: POST /finance_transactions/{location_id}
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

## Request fields (application/json):

  - `expense_id` (number)
    Payment item
    Example: 2640

  - `amount` (number)
    Transaction amount
    Example: 100

  - `account_id` (number)
    Checkout ID
    Example: 39105

  - `client_id` (number)
    Client ID
    Example: 4240788

  - `supplier_id` (number)
    Supplier ID

  - `master_id` (number)
    team member ID

  - `comment` (number)
    A comment
    Example: "Test transaction comment"

  - `date` (string)
    Transaction creation date
    Example: "2026-08-29T10:00:00-05:00"

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":277016617,"document_id":0,"date":"2026-09-21T23:00:00.000-05:00","type_id":5,"expense_id":5,"account_id":774020,"amount":100,"client_id":51520012,"master_id":921395,"supplier_id":0,"comment":"Transaction comment","item_id":0,"target_type_id":0,"record_id":0,"goods_transaction_id":0,"expense":{"id":5,"title":"Provision of services"},"account":{"id":774020,"title":"Archive location account","is_cash":true,"is_default":false},"client":{"id":51520012,"name":"Sweeney Todd","phone":"+13155550175","email":"mail@example.com"},"master":{"id":921395,"name":"Valeria"},"supplier":[]}

  - `data.id` (number)
    Transaction ID
    Example: 277016617

  - `data.document_id` (number)
    Document ID

  - `data.date` (string)
    Transaction creation date
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.type_id` (number)
    Payment type ID
    Example: 5

  - `data.expense_id` (number)
    Payment Item ID
    Example: 5

  - `data.account_id` (number)
    Checkout ID
    Example: 774020

  - `data.amount` (number)
    Transaction amount
    Example: 100

  - `data.client_id` (number)
    Client ID
    Example: 51520012

  - `data.master_id` (number)
    team member ID
    Example: 921395

  - `data.supplier_id` (number)
    Supplier ID

  - `data.comment` (string)
    A comment
    Example: "Transaction comment"

  - `data.item_id` (integer)

  - `data.target_type_id` (integer)

  - `data.record_id` (number)
    Appointment ID

  - `data.goods_transaction_id` (number)
    Commodity transaction ID

  - `data.expense` (object)
    Payment type
    Example: {"id":5,"title":"Provision of services"}

  - `data.expense.id` (number)
    Payment type ID
    Example: 5

  - `data.expense.title` (string)
    Payment type name
    Example: "Provision of services"

  - `data.account` (object)
    Location account
    Example: {"id":774020,"title":"Archive location account","is_cash":true,"is_default":false}

  - `data.account.id` (number)
    Checkout ID
    Example: 774020

  - `data.account.title` (string)
    Location account name
    Example: "Archive location account"

  - `data.account.is_cash` (boolean)
    Is cash
    Example: true

  - `data.account.is_default` (boolean)
    Is the checkout by default

  - `data.client` (object)
    Customer
    Example: {"id":51520012,"name":"Sweeney Todd","phone":"+13155550175","email":"mail@example.com"}

  - `data.client.id` (number)
    Client ID
    Example: 51520012

  - `data.client.name` (string)
    Client name
    Example: "Sweeney Todd"

  - `data.client.phone` (string)
    Customer phone
    Example: "+13155550175"

  - `data.client.email` (string)
    Client Email
    Example: "mail@example.com"

  - `data.master` (object)
    team member
    Example: {"id":921395,"name":"Valeria"}

  - `data.master.id` (number)
    team member ID
    Example: 921395

  - `data.master.name` (string)
    team member name
    Example: "Valeria"

  - `data.supplier` (array)
    counterparty
    Example: []

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


