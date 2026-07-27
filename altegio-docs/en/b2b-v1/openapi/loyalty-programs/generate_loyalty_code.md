# Gift Card/Membership Code Generation

+ Options
    + location_id (required, number, 1) - location ID
    + product_id (required, number, 1) - product ID (gift card/ membership)

Endpoint: GET /loyalty/generate_code/{location_id}/{product_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

  - `product_id` (number, required)
    Product ID (membership/gift card)

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.code` (string, required)
    Generated code

  - `meta` (array, required)

  - `success` (boolean, required)

  - `LoyaltyGenerateCode200Option` (object)

  - `LoyaltyGenerateCode200Option.data` (object, required)

  - `LoyaltyGenerateCode200Option.meta` (array, required)
    metadata (empty array)

  - `LoyaltyGenerateCode200Option.success` (boolean, required)
    flag indicating that the response was completed without errors (true)

## Response 403 fields (application/json):

  - `meta` (object, required)

  - `meta.message` (string, required)
    Error message

  - `success` (boolean, required)

  - `LoyaltyGenerateCodeErrorOption` (object)

  - `LoyaltyGenerateCodeErrorOption.data` (string, required)
    Error data

  - `LoyaltyGenerateCodeErrorOption.success` (boolean, required)
    Error

## Response 404 fields (application/json):

  - `meta` (object, required)

  - `success` (boolean, required)

  - `LoyaltyGenerateCodeErrorOption` (object)


