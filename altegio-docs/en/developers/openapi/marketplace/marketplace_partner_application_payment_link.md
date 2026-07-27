# Generate payment link

Generates a payment link for application payment through Altegio platform.

Note: For marketplace partners only.

Endpoint: GET /marketplace/application/payment_link
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}

## Query parameters:

  - `salon_id` (integer, required)
    Location ID
    Example: 123

  - `application_id` (integer, required)
    Application ID
    Example: 456

  - `discount` (number)
    Discount percentage (optional)
    Example: 15.55

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `data.url` (string)
    Payment page URL
    Example: "https://alteg.io/appstore/payment/?salon_id=1111&application_id=1&discount=15.5&source=api&sign=6f9b5bc6fa787780161ed090af9429d5af963562b7a6ac8051888147370674be"

  - `meta` (array)
    Example: []

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 404 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)


