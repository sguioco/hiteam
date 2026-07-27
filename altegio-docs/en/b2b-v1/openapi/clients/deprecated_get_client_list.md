# Deprecated. Get a list of clients (deprecated)

+ Parameter
    + company_id (required, number, 1) - location ID
    + page (number, 1) - Page number
    + count (number, 20) - Number of clients per page


#### Client filtering
+ fullname:Joh (optional, string) - Name (part of name) to filter clients
+ phone:1315 (optional, string) - Phone (part of the number) for filtering clients
+ email:test@ (optional, string) - Email (part) for client filtering
+ card:5663rt (optional, string) - Card (part) for filtering customers by loyalty card number
+ paid_min:100 (optional, number) - Minimum amount paid, to filter customers by the amount of payments
+ paid_max:0 (optional, number) - Maximum amount paid, to filter customers by the amount of payments
+ paid_max:0 (optional, number) - Maximum amount paid, to filter customers by the amount of payments
+ id:66 (optional, number) - ID of one client for filtering clients
+ id[]: 66 (optional, array) - IDs of multiple clients to filter
+ changed_after: '2000-01-01T00:00:00' (optional, string) - Filtering clients changed/created since a specific date and time
+ changed_before: '2020-12-31T23:59:59' (optional, string) - Filtering clients changed/created before a specific date and time

Endpoint: GET /clients/{location_id}
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

  - `fullname` (string)
    Name (part of the name) for client filtering
    Example: "Joh"

  - `phone` (string)
    Phone (part of the number) for customer filtering
    Example: "1315"

  - `email` (string)
    Email (part) for customer filtering
    Example: "test@"

  - `paid_min` (number)
    Minimum amount paid, to filter customers by the amount of payments
    Example: 1

  - `paid_max` (number)
    Maximum amount paid, to filter customers by the amount of payments
    Example: 1

  - `page` (number)
    Page number
    Example: 1

  - `count` (number)
    Number of customers per page
    Example: 20

  - `location_id` (number)
    ID of one or more clients to filter clients
    Example: 66

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":66,"name":"Customer","phone":13155550177,"email":"asdfgh@g.com","categories":[{"id":3,"title":"Black list","color":"#0f0f0f"},{"id":4,"title":"VIP","color":"#e8d313"}],"gender_id":0,"gender":"unknown","discount":10,"importance_id":3,"importance":"Gold","card":123456789,"birth_date":"2026-09-21","comment":"test","sms_check":1,"sms_not":0,"spent":71842,"balance":0,"visits":34,"last_change_date":"2026-02-01T12:00:00-0500","custom_fields":{}},{"id":16,"name":"James","phone":13155550178,"email":"","categories":{},"gender_id":0,"gender":"unknown","discount":0,"importance_id":0,"importance":"No importance class","card":"","birth_date":null,"comment":"","sms_check":0,"sms_not":0,"spent":0,"balance":0,"visits":3,"last_change_date":"2026-04-01T12:00:00-0500","custom_fields":{}}]

  - `data.id` (number)
    Client ID

  - `data.name` (string)
    Client name

  - `data.phone` (string)
    Customer phone

  - `data.email` (string)
    Client Email

  - `data.categories` (array)
    Client categories

  - `data.categories.id` (integer)
    Category ID

  - `data.categories.title` (string)
    name of category

  - `data.categories.color` (string)
    Category color

  - `data.gender_id` (number)
    Gender identifier, 0 - unknown, 1 - male, 2 - female

  - `data.gender` (string)
    Gender name

  - `data.discount` (number)
    Discount

  - `data.importance_id` (integer)
    Client priority level (0 - none, 1 - bronze, 2 - silver, 3 - gold)

  - `data.importance` (string)
    Client priority level name

  - `data.card` (number)
    Client card number

  - `data.birth_date` (string)
    Client's date of birth

  - `data.comment` (string)
    Customer comment

  - `data.sms_check` (number)
    1 - Happy Birthday by SMS, 0 - do not congratulate

  - `data.sms_not` (number)
    1 - Exclude the client from SMS mailings, 0 - do not exclude

  - `data.spent` (number)
    How much money spent in the location at the time of adding

  - `data.balance` (number)
    Client balance

  - `data.visits` (number)
    Number of visits

  - `data.last_change_date` (string)
    Last modified date

  - `data.custom_fields` (object)
    Additional client fields

  - `meta` (object)
    Metadata (contains the page number and number of clients per page)
    Example: {"page":1,"total_count":8}

  - `meta.page` (integer)
    Example: 1

  - `meta.total_count` (integer)
    Example: 8

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


