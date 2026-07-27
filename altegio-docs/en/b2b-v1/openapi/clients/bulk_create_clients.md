# Bulk adding clients

Endpoint: POST /clients/{location_id}/bulk
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

  - `name` (string, required)
    Client name

  - `phone` (string, required)
    Customer phone

  - `surname` (string)
    Client surname

  - `middle_name` (string)
    Client middle name

  - `email` (string)
    Client Email

  - `gender_id` (number)
    Gender of the client (1 - male, 2 - female, 0 - unknown)

  - `importance_id` (number)
    Client priority level (0 - none, 1 - bronze, 2 - silver, 3 - gold)

  - `discount` (number)
    Customer Discount

  - `card` (string)
    Client card number

  - `birth_date` (string)
    Date of birth of the client in the format yyyy-mm-dd

  - `comment` (string)
    A comment

  - `spent` (number)
    How much money spent in the location at the time of adding

  - `balance` (number)
    Client balance

  - `sms_check` (number)
    1 - Happy Birthday by SMS, 0 - do not congratulate

  - `sms_not` (number)
    1 - Exclude the client from SMS mailings, 0 - do not exclude

  - `categories` (object)
    Array of customer tag IDs

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
