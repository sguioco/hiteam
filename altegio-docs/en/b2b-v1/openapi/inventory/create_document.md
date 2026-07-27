# Create document

Endpoint: POST /storage_operations/documents/{location_id}
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

  - `create_date` (string, required)
    Date of the inventory transaction
    Example: "2026-09-21T23:00:00.000-05:00"

  - `storage_id` (number, required)
    Inventory ID
    Example: 36539

  - `type_id` (number, required)
    Document type (sale 1, receipt 3, write-off 7)
    Example: 1

  - `comment` (string)
    A comment
    Example: "Document comment"

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":22255503,"type_id":1,"type":{"id":1,"title":"Sale of goods"},"storage_id":36539,"user_id":999290,"company_id":4564,"number":1251,"comment":"Document comment","create_date":"2026-09-21T23:00:00.000-05:00","storage":{"id":36539,"title":"Products"},"company":{"id":4564,"title":"Business Example","country_id":7,"city_id":2,"timezone":"-5","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"https://app.alteg.io/uploads/s_120d9410f1472a4e6bdbafefe7eeba42.png","zip":"","phones":[],"site":"www.example.com"},"user":{"id":999290,"name":"User name","phone":"+13155550175"}}

  - `data.id` (number)
    Document ID
    Example: 22255503

  - `data.type_id` (number)
    Document type identifier
    Example: 1

  - `data.type` (object)
    Document type
    Example: {"id":1,"title":"Sale of goods"}

  - `data.type.id` (number)
    Document type identifier
    Example: 1

  - `data.type.title` (string)
    Document type name
    Example: "Sale of goods"

  - `data.storage_id` (number)
    Inventory ID
    Example: 36539

  - `data.user_id` (number)
    User ID
    Example: 999290

  - `data.company_id` (number)
    location ID
    Example: 4564

  - `data.number` (number)
    Document Number
    Example: 1251

  - `data.comment` (string)
    A comment
    Example: "Document comment"

  - `data.create_date` (string)
    date of creation
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.bill_print_status` (number)
    Bill print status

  - `data.storage` (object)
    Inventory
    Example: {"id":36539,"title":"Products"}

  - `data.storage.id` (number)
    Inventory ID
    Example: 36539

  - `data.storage.title` (string)
    Inventory name
    Example: "Products"

  - `data.company` (object)
    location
    Example: {"id":4564,"title":"Business Example","country_id":7,"city_id":2,"timezone":"-5","address":"New York, 787 Jackson Drive","coordinate_lat":40.73061,"coordinate_lon":-73.935242,"logo":"https://app.alteg.io/uploads/s_120d9410f1472a4e6bdbafefe7eeba42.png","zip":"","phones":[],"site":"www.example.com"}

  - `data.company.id` (number)
    location ID
    Example: 4564

  - `data.company.title` (string)
    location name
    Example: "Business Example"

  - `data.company.public_title` (string)
    Public-facing location name

  - `data.company.business_group_id` (number)
    Business group ID

  - `data.company.business_type_id` (number)
    Business type ID

  - `data.company.country_id` (number)
    Country ID
    Example: 7

  - `data.company.city_id` (number)
    City ID
    Example: 2

  - `data.company.timezone` (number)
    Timezone ID
    Example: "-5"

  - `data.company.timezone_name` (string)
    Timezone name

  - `data.company.address` (string)
    location address
    Example: "New York, 787 Jackson Drive"

  - `data.company.coordinate_lat` (number)
    Latitude
    Example: 40.73061

  - `data.company.coordinate_lon` (number)
    Longitude
    Example: -73.935242

  - `data.company.logo` (string)
    Let, on which the location logo is located
    Example: "https://app.alteg.io/uploads/s_120d9410f1472a4e6bdbafefe7eeba42.png"

  - `data.company.zip` (string)
    Postcode

  - `data.company.phones` (array)
    location phone
    Example: []

  - `data.company.site` (string)
    The site of the location
    Example: "www.example.com"

  - `data.company.phone` (string)
    Location phone number

  - `data.company.allow_delete_record` (boolean)
    Allow deleting records

  - `data.company.allow_change_record` (boolean)
    Allow changing records

  - `data.user` (object)
    User
    Example: {"id":999290,"name":"User name","phone":"+13155550175"}

  - `data.user.id` (number)
    User ID
    Example: 999290

  - `data.user.name` (string)
    Username
    Example: "User name"

  - `data.user.phone` (string)
    User phone
    Example: "+13155550175"

  - `data.user.email` (string)
    User email

  - `data.user.is_approved` (boolean)
    Is user approved

  - `data.user.avatar` (string)
    User avatar URL

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


