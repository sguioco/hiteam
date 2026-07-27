# Get Transactions by Visit or Appointment ID

#### Transaction filtering

+ record_id: Appointment ID

+ visit_id: ID of the visit

Endpoint: GET /timetable/transactions/{location_id}
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

  - `record_id` (number)
    Appointment ID

  - `visit_id` (number)
    Visit ID

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":4815162342,"document_id":22256641,"expense":{"id":5,"title":"Provision of services"},"date":"2026-04-13T15:34:31-0500","amount":1000,"comment":"Comment","master":{"id":1926,"title":"Sweeney Todd"},"supplier":{"id":1968,"title":"George"},"account":{"id":23182,"title":"Cards"},"client":{"id":481516,"name":"John Turk","phone":13155550176},"last_change_date":"2026-02-01T12:00:00-0500","record_id":308786662,"visit_id":262551993,"sold_item_id":7134634,"sold_item_type":"service"}]

  - `data.id` (number)
    Transaction ID

  - `data.document_id` (number)
    Document ID

  - `data.expense` (object)
    Payment type

  - `data.expense.id` (number)
    Payment type ID

  - `data.expense.title` (string)
    Payment type name

  - `data.date` (string)
    Transaction creation date

  - `data.amount` (number)
    Transaction amount

  - `data.comment` (string)
    A comment

  - `data.master` (object)
    Team Member

  - `data.master.id` (number)
    team member ID

  - `data.master.title` (string)
    team member name

  - `data.supplier` (object)
    counterparty

  - `data.supplier.id` (number)
    Supplier ID

  - `data.supplier.title` (string)
    Counterparty name

  - `data.account` (object)
    Location account

  - `data.account.id` (number)
    Checkout ID

  - `data.account.title` (string)
    Location account name

  - `data.client` (object)
    Customer

  - `data.client.id` (number)
    Client ID

  - `data.client.name` (string)
    Client name

  - `data.client.phone` (string)
    Customer phone

  - `data.last_change_date` (string)
    Last modified date

  - `data.record_id` (number)
    Appointment ID

  - `data.visit_id` (number)
    Visit ID

  - `data.sold_item_id` (number)
    Identifier of the sold product/service

  - `data.sold_item_type` (number)
    Sale entity type (product/service)

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


