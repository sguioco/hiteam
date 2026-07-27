# Get user gift cards

Returns a list of authorized user gift cards

Endpoint: GET /user/loyalty/certificates
Version: 1.0.0
Security: BearerPartner

## Query parameters:

  - `company_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

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
    Example: [{"id":409726,"number":888,"balance":9000,"default_balance":9000,"type_id":27841,"status_id":2,"created_date":"2026-09-21T23:00:00.000-05:00","expiration_date":"2026-09-21T23:00:00.000-05:00","type":{"id":27841,"title":"certificate 9000","balance":9000,"is_multi":true,"company_group_id":128284,"item_type_id":0,"expiration_type_id":2,"expiration_timeout":365,"expiration_timeout_unit_id":1,"is_allow_empty_code":false,"item_type":{"id":0,"title":"No limits"}},"status":{"id":2,"title":"activated"}}]

  - `data.id` (integer)
    Certificate ID

  - `data.number` (string)
    Certificate number

  - `data.balance` (number)
    Current balance

  - `data.default_balance` (number)
    Starting balance

  - `data.type_id` (integer)
    Certificate type identifier

  - `data.status_id` (integer)
    Status ID

  - `data.created_date` (string)
    Date of sale

  - `data.expiration_date` (string)
    Burn date

  - `data.type` (object)
    Object with certificate type information

  - `data.type.id` (integer)
    Certificate type identifier

  - `data.type.title` (string)
    Gift card type name

  - `data.type.balance` (integer)
    Certificate denomination

  - `data.type.is_multi` (boolean)
    Is it available for multiple debits

  - `data.type.company_group_id` (integer)
    ID of the chain where the certificate type was created

  - `data.type.item_type_id` (integer)
    Restriction on the use of redemption points. 0 - no restrictions, 1 - only services, 2 - some services + all products, 3 - some services, 4 - only products

  - `data.type.expiration_type_id` (integer)
    The ID of the expiration limit. 0 - unlimited, 1 - fixed date, 2 - fixed period

  - `data.type.expiration_date` (string)
    Burn date of all certificates. Populated with expiration_type_id = 1

  - `data.type.expiration_timeout` (integer)
    Validity period of certificates. Populated with expiration_type_id = 2

  - `data.type.expiration_timeout_unit_id` (integer)
    Time units. 1 - Day, 2 - Week, 3 - Month, 4 - Year

  - `data.type.is_allow_empty_code` (boolean)
    Sale without code

  - `data.type.item_type` (object)
    Object with item_type_id and its name

  - `data.type.item_type.id` (integer)
    Identifier of the expiration limit

  - `data.type.item_type.title` (string)
    Name of the constraint

  - `data.status` (object)
    An object with information about the current status of the certificate

  - `data.status.id` (integer)
    Status ID

  - `data.status.title` (string)
    Status name

  - `meta` (object)
    Metadata (contains the number of certificates found)
    Example: {"count":1}

  - `meta.count` (integer)
    Example: 1

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


