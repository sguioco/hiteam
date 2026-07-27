# Create an inventory operation

An inventory operation is created by submitting a document along with multiple product transactions in a single API request. If a payment type is specified, the corresponding financial transactions will be generated automatically.

Endpoint: POST /storage_operations/operation/{location_id}
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

## Request fields (*/*):

  - `create_date` (string, required)
    Document creation date
    Example: "2026-09-21T23:00:00.000-05:00"

  - `goods_transactions` (array, required)
    An array of objects containing transaction parameters, similar to a request to create a product transaction

  - `storage_id` (number, required)
    Inventory ID
    Example: 91271

  - `type_id` (number, required)
    Document type (Sale 1, Usage / Material Consumption 2, Product Receipt / Incoming 3, Inventory Write-off / Product Disposal 4, Internal Transfer 5)
    Example: 1

  - `comment` (string)
    A comment
    Example: "test document comment"

  - `master_id` (number)
    team member ID

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"document":{"id":22255506,"type_id":1,"type":{"id":1,"title":"Sale of goods"},"storage_id":91271,"user_id":999290,"company_id":4564,"number":1254,"comment":"test document comment","create_date":"2026-09-21T23:00:00.000-05:00","storage":{"id":91271,"title":"Secret place"},"company":{"id":4564,"title":"Business Example","country_id":7,"city_id":2,"timezone":"-5","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"https://app.alteg.io/uploads/s_120d9410f1472a4e6bdbafefe7eeba42.png","zip":"","phones":[],"site":"www.example.com"},"user":{"id":999290,"name":"User name","phone":"+13155550175"}},"transactions":[{"id":3428012,"document_id":22255506,"type_id":1,"type":{"id":1,"title":"Sale of goods"},"company_id":4564,"good_id":232674,"amount":-1,"cost_per_unit":100,"discount":10,"cost":90,"unit_id":1,"storage_id":91271,"supplier_id":0,"client_id":0,"master_id":0,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"test transaction comment","deleted":false,"good":{"id":232674,"title":"Edition De Luxe"},"storage":{"id":91271,"title":"Secret place"},"supplier":[],"client":[],"master":[],"unit":{"id":1,"title":"Thing"}}]}

  - `data.document` (object)
    Document
    Example: {"id":22255506,"type_id":1,"type":{"id":1,"title":"Sale of goods"},"storage_id":91271,"user_id":999290,"company_id":4564,"number":1254,"comment":"test document comment","create_date":"2026-09-21T23:00:00.000-05:00","storage":{"id":91271,"title":"Secret place"},"company":{"id":4564,"title":"Business Example","country_id":7,"city_id":2,"timezone":"-5","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"https://app.alteg.io/uploads/s_120d9410f1472a4e6bdbafefe7eeba42.png","zip":"","phones":[],"site":"www.example.com"},"user":{"id":999290,"name":"User name","phone":"+13155550175"}}

  - `data.document.id` (number)
    Document ID
    Example: 22255506

  - `data.document.type_id` (number)
    Document type identifier
    Example: 1

  - `data.document.type` (object)
    Document Type
    Example: {"id":1,"title":"Sale of goods"}

  - `data.document.type.id` (number)
    Document type identifier
    Example: 1

  - `data.document.type.title` (string)
    Document type name
    Example: "Sale of goods"

  - `data.document.storage_id` (number)
    Inventory ID
    Example: 91271

  - `data.document.user_id` (number)
    User ID
    Example: 999290

  - `data.document.company_id` (number)
    location ID
    Example: 4564

  - `data.document.number` (number)
    Document Number
    Example: 1254

  - `data.document.comment` (string)
    A comment
    Example: "test document comment"

  - `data.document.create_date` (string)
    date of creation
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.document.storage` (object)
    Inventory
    Example: {"id":91271,"title":"Secret place"}

  - `data.document.storage.id` (number)
    Inventory ID
    Example: 91271

  - `data.document.storage.title` (string)
    Inventory name
    Example: "Secret place"

  - `data.document.company` (object)
    location
    Example: {"id":4564,"title":"Business Example","country_id":7,"city_id":2,"timezone":"-5","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"https://app.alteg.io/uploads/s_120d9410f1472a4e6bdbafefe7eeba42.png","zip":"","phones":[],"site":"www.example.com"}

  - `data.document.company.id` (number)
    location ID
    Example: 4564

  - `data.document.company.title` (string)
    location name
    Example: "Business Example"

  - `data.document.company.country_id` (number)
    Country ID
    Example: 7

  - `data.document.company.city_id` (number)
    City ID
    Example: 2

  - `data.document.company.timezone` (string)
    time zone
    Example: "-5"

  - `data.document.company.address` (string)
    location address
    Example: "New York, 787 Jackson Drive"

  - `data.document.company.coordinate_lat` (string)
    Latitude
    Example: 40.73061

  - `data.document.company.coordinate_lon` (string)
    Longitude
    Example: -73.935242

  - `data.document.company.logo` (string)
    Let, on which the location logo is located
    Example: "https://app.alteg.io/uploads/s_120d9410f1472a4e6bdbafefe7eeba42.png"

  - `data.document.company.zip` (string)
    Postcode

  - `data.document.company.phones` (array)
    location phone
    Example: []

  - `data.document.company.site` (string)
    The site of the location
    Example: "www.example.com"

  - `data.document.user` (object)
    User
    Example: {"id":999290,"name":"User name","phone":"+13155550175"}

  - `data.document.user.id` (number)
    User ID
    Example: 999290

  - `data.document.user.name` (string)
    Username
    Example: "User name"

  - `data.document.user.phone` (string)
    User phone number
    Example: "+13155550175"

  - `data.transactions` (array)
    transaction
    Example: [{"id":3428012,"document_id":22255506,"type_id":1,"type":{"id":1,"title":"Sale of goods"},"company_id":4564,"good_id":232674,"amount":-1,"cost_per_unit":100,"discount":10,"cost":90,"unit_id":1,"storage_id":91271,"supplier_id":0,"client_id":0,"master_id":0,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"test transaction comment","deleted":false,"good":{"id":232674,"title":"Edition De Luxe"},"storage":{"id":91271,"title":"Secret place"},"supplier":[],"client":[],"master":[],"unit":{"id":1,"title":"Thing"}}]

  - `data.transactions.id` (number)
    Transaction ID

  - `data.transactions.document_id` (number)
    Document ID

  - `data.transactions.type_id` (number)
    Document type identifier

  - `data.transactions.type` (object)
    Document type

  - `data.transactions.type.id` (number)
    Document type identifier

  - `data.transactions.type.title` (string)
    Document type name

  - `data.transactions.company_id` (number)
    location ID

  - `data.transactions.good_id` (number)
    Item ID

  - `data.transactions.amount` (number)
    Quantity

  - `data.transactions.cost_per_unit` (number)
    Price per unit

  - `data.transactions.discount` (number)
    Skdika

  - `data.transactions.cost` (number)
    total price

  - `data.transactions.unit_id` (number)
    Unit ID

  - `data.transactions.storage_id` (number)
    Inventory ID

  - `data.transactions.supplier_id` (number)
    Vendor ID

  - `data.transactions.client_id` (number)
    Client ID

  - `data.transactions.master_id` (number)
    team member ID

  - `data.transactions.create_date` (string)
    date of creation

  - `data.transactions.comment` (string)
    A comment

  - `data.transactions.deleted` (boolean)
    Has the transaction been deleted?

  - `data.transactions.good` (object)
    Product

  - `data.transactions.good.id` (number)
    Item ID

  - `data.transactions.good.title` (string)
    Product Name

  - `data.transactions.storage` (object)
    Inventory

  - `data.transactions.storage.id` (number)
    Inventory ID

  - `data.transactions.storage.title` (string)
    Inventory name

  - `data.transactions.supplier` (array)
    The supplier

  - `data.transactions.client` (array)
    Customer

  - `data.transactions.master` (array)
    Team Member

  - `data.transactions.unit` (object)
    Units

  - `data.transactions.unit.id` (number)
    Unit ID

  - `data.transactions.unit.title` (string)
    Unit name

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


