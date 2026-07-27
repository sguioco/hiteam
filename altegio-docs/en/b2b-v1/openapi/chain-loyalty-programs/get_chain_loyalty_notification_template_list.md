# Get a list of loyalty notification templates

Endpoint: GET /chain/{chain_id}/loyalty/notification_message_templates/programs
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `id` (integer)
    Template ID
    Example: 12

  - `type` (string)
    Template option
    Enum: "big", "mid", "small", "custom"

  - `body` (string)
    Template text
    Example: "Your discount expires tomorrow"

  - `message_type` (string)
    Message type
    Enum: "loyalty_discount_expiration", "loyalty_cashback_expiration", "loyalty_discount_increased", "loyalty_discount_decreased", "loyalty_card_created", "loyalty_card_withdraw", "loyalty_withdraw_cancelled", "loyalty_card_manual", "loyalty_card_manual_withdraw", "loyalty_card_cashback", "loyalty_card_cashback_cancelled", "loyalty_card_income", "loyalty_discount_changed", "loyalty_cashback_changed", "loyalty_settings_abonement_notification"

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


