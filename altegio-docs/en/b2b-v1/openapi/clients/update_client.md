# Edit client

Endpoint: PUT /client/{location_id}/{id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `id` (number, required)
    Client ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (*/*):

  - `name` (string, required)
    Client name
    Example: "James"

  - `phone` (string, required)
    Customer phone
    Example: 13155550179

  - `surname` (string)
    Client surname
    Example: "Smith"

  - `middle_name` (string)
    Client middle name
    Example: "James"

  - `email` (string)
    Client Email
    Example: "j.smith@example.com"

  - `gender_id` (number)
    Gender of the client (1 - male, 2 - female, 0 - unknown)
    Example: 1

  - `importance_id` (number)
    Client priority level (0 - none, 1 - bronze, 2 - silver, 3 - gold)
    Example: 1

  - `discount` (number)
    Customer Discount
    Example: 15

  - `card` (string)
    Client card number
    Example: 555888666

  - `birth_date` (string)
    Date of birth of the client in the format yyyy-mm-dd
    Example: "952041600"

  - `comment` (string)
    A comment
    Example: "throws show-off"

  - `spent` (number)
    How much money spent in the location at the time of adding
    Example: 1000

  - `balance` (number)
    Client balance
    Example: -200

  - `sms_check` (number)
    1 - Happy Birthday by SMS, 0 - do not congratulate

  - `sms_not` (number)
    1 - Exclude the client from SMS mailings, 0 - do not exclude

  - `labels` (object)
    Array of customer tag IDs
    Example: [101,102]

  - `custom_fields` (object)
    Array of additional client fields as "api-key": "value" pairs
    Example: {"key-1":"value-1"}

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
