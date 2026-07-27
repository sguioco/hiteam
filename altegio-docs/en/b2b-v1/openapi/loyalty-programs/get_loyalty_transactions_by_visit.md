# Get loyalty transactions by visit

List of transactions for loyalty promotions for this visit

Endpoint: GET /visit/loyalty/transactions/{visit_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `visit_id` (number, required)
    Visit ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `id` (integer)
    Loyalty transaction ID

  - `status_id` (integer)
    Status ID

  - `amount` (number)
    Transaction amount

  - `type_id` (integer)
    Transaction type identifier

  - `program_id` (integer)
    Loyalty program ID

  - `card_id` (integer)
    Loyalty card ID

  - `salon_group_id` (integer)
    ID of the chain to which the loyalty belongs

  - `item_id` (integer)
    Identifier of the product/service to which the promotion applies

  - `item_type_id` (integer)
    Operation type identifier

  - `item_record_id` (integer)
    Identifier of the appointment to which the service/product belongs

  - `goods_transaction_id` (integer)
    Commodity transaction ID

  - `is_discount` (boolean)
    Is a discount

  - `is_loyalty_withdraw` (boolean)
    Is the application of loyalty canceled

  - `type` (object)
    Loyalty type

  - `type.id` (integer)
    Loyalty type identifier

  - `type.title` (string)
    Loyalty type name

  - `program` (object)
    Promotion Information

  - `program.id` (integer)
    Promotion ID

  - `program.title` (string)
    Share name

  - `program.value` (integer)
    Discount value

  - `program.loyalty_type_id` (integer)
    Promotion type ID

  - `program.item_type_id` (integer)
    Is cashback earned on products?

  - `program.value_unit_id` (integer)
    Bonus field. Discount % or Fixed. sum

  - `program.group_id` (integer)
    ID of the chain where the action was created

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


