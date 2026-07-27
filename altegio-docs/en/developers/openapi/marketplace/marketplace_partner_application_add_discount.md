# Set payment discount for locations

Sets a payment discount for specific locations when they pay through Altegio platform.

Note: This endpoint is intended for marketplace partners only.
Requires marketplace partner authorization.

Endpoint: POST /marketplace/application/add_discount
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}

## Request fields (application/json):

  - `salon_ids` (array, required)
    List of location IDs to apply discount
    Example: [123,456]

  - `application_id` (integer, required)
    Application ID from marketplace
    Example: 123

  - `discount` (number, required)
    Discount amount (percentage or fixed amount depending on configuration)
    Example: 15.54

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `meta` (array)

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "No access to application"

## Response 404 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Application not found"


