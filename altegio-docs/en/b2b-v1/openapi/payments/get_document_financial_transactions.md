# Get document financial transactions

Endpoint: GET /storage_operations/documents/finance_transactions/{document_id}
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
    Example: [{"id":9053737,"date":"2026-09-21T23:00:00.000-05:00","type_id":2640,"expense_id":2640,"account_id":35501,"amount":434,"client_id":4240788,"master_id":0,"supplier_id":0,"comment":"Transaction comment","item_id":0,"target_type_id":0,"record_id":0,"expense":{"id":2640,"title":"Provision of corporate services"},"account":{"id":35501,"title":"Location account","type_id":0,"type":0,"comment":"","company_id":4564},"client":{"id":4240788,"name":"Client","phone":"+13155550175"},"master":[],"supplier":[]},{"id":9053738,"date":"2026-09-21T23:00:00.000-05:00","type_id":2640,"expense_id":2640,"account_id":35501,"amount":434,"client_id":4240788,"master_id":0,"supplier_id":0,"comment":"Transaction comment","item_id":0,"target_type_id":0,"record_id":0,"expense":{"id":2640,"title":"Provision of corporate services"},"account":{"id":35501,"title":"Location account","type_id":0,"type":0,"comment":"","company_id":4564},"client":{"id":4240788,"name":"Client","phone":"+13155550175"},"master":[],"supplier":[]}]

  - `data.id` (number)
    Transaction ID

  - `data.date` (string)

  - `data.type_id` (number)
    Transaction type identifier

  - `data.expense_id` (number)
    Payment Item ID

  - `data.account_id` (number)
    Checkout ID

  - `data.amount` (number)
    Transaction amount

  - `data.client_id` (number)
    Client ID

  - `data.master_id` (number)
    team member ID

  - `data.supplier_id` (number)
    Vendor ID

  - `data.comment` (string)
    A comment

  - `data.item_id` (integer)

  - `data.target_type_id` (integer)

  - `data.record_id` (number)
    Appointment ID

  - `data.expense` (object)
    Payment item

  - `data.expense.id` (number)
    Payment Item ID

  - `data.expense.title` (string)
    Name of payment item

  - `data.account` (object)
    Location account

  - `data.account.id` (number)
    Checkout ID

  - `data.account.title` (string)
    Location account name

  - `data.account.type_id` (number)
    Transaction type identifier

  - `data.account.type` (number)
    Transaction type

  - `data.account.comment` (string)
    A comment

  - `data.account.company_id` (number)
    location ID

  - `data.client` (object)
    Customer

  - `data.client.id` (number)
    Client ID

  - `data.client.name` (string)
    Client name

  - `data.client.phone` (string)
    Customer phone

  - `data.master` (array)
    team member

  - `data.supplier` (array)
    The supplier

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


