# Manual withdraw/deposit to loyalty card in location

Manual withdraw/deposit to loyalty card in location

Endpoint: POST /company/{location_id}/loyalty/cards/{card_id}/manual_transaction
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

  - `card_id` (number, required)
    Loyalty card ID

## Request fields (application/json):

  - `amount` (number, required)
    Withdraw/deposit amount. Positive for deposit, negative for withdraw.
    Example: 100.5

  - `title` (string)
    Optional comment

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Loyalty card

  - `data.id` (number)
    Loyalty card ID

  - `data.balance` (number)
    Card balance

  - `data.points` (number)
    Points

  - `data.paid_amount` (number)
    \"Paid\" amount

  - `data.sold_amount` (number)
    \"Sold\" amount

  - `data.visits_count` (number)
    Visits count

  - `data.number` (string)
    Loyalty card number

  - `data.type_id` (number)
    Loyalty card type ID

  - `data.salon_group_id` (number)
    Chain ID

  - `data.max_discount_percent` (number)
    Maximum discount percent

  - `data.max_discount_amount` (number)
    Maximum discount amount

  - `meta` (object,array)
    Additional response data (empty object or empty array)

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


