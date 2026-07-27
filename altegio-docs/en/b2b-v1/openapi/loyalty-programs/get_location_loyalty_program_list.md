# Get a List of Promotions Active in the Location

The method allows you to get a list of promotions that are active for the specified location.

Endpoint: GET /company/{location_id}/loyalty/programs/search
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer bearer_token, User user_token

## Query parameters:

  - `include` (string)
    The first_transaction_date value adds the date of the first stock transaction to the response.

  - `type` (string)
    Promotion type
    Enum: "discount_static", "discount_accumulative_visits", "discount_accumulative_sold", "discount_accumulative_paid", "cashback_static_sold", "cashback_static_paid", "cashback_accumulative_paid", "cashback_accumulative_sold", "cashback_accumulative_paid_visits", "cashback_accumulative_sold_visits", "cashback_sold_visits", "cashback_paid_visits", "package_discount"

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status.
    Example: true

  - `data` (array)
    An array of data objects.
    Example: [{"id":53591,"title":"100 USD discount on Altegio Implementation Consultation","type":"discount_static","loyalty_type_id":1,"item_type_id":4,"service_item_type":"custom_allowed","good_item_type":"any_allowed","value_unit_id":2,"value_unit":"amount","group_id":502054,"usage_limit":0,"visit_multiplicity":1,"sold_items_multiplicity":1,"current_package_progress":0,"allowed_usages_amount":0,"expiration_timeout":0,"expiration_timeout_unit":"day","expiration_notification_timeout":0,"params_source_type":"loyalty_card","on_changed_notification_template_id":0,"on_expiration_notification_template_id":0}]

  - `data.id` (integer)
    Promotion ID

  - `data.title` (string)
    Share name

  - `data.type` (string)
    Promotion type
    Enum: same as `type` (13 values)

  - `data.loyalty_type_id` (integer)
    Promotion type ID

  - `data.item_type_id` (integer)
    Identifier of the discount application type

  - `data.service_item_type` (string)
    Type of application to services
    Enum: "any_allowed", "not_allowed", "custom_allowed"

  - `data.good_item_type` (string)
    Type of application to products
    Enum: same as `data.service_item_type` (3 values)

  - `data.value_unit_id` (integer)
    Unit ID of the bonus or discount

  - `data.value_unit` (string)
    Bonus or discount measurement unit (percentage, fixed amount)
    Enum: "percent", "amount"

  - `data.group_id` (integer)
    Chain ID

  - `data.usage_limit` (integer)
    Limit on the number of applications (only for cashback)

  - `data.visit_multiplicity` (integer)
    Multiplicity of application by visits (only for cashback)

  - `data.sold_items_multiplicity` (integer)
    How many services you need to pay to get a discount on promotional services (only for the promotion type "Discount by condition")

  - `data.current_package_progress` (integer)
    The current number of uses of the promotion

  - `data.allowed_usages_amount` (integer)
    Limitation on the number of allowed uses

  - `data.expiration_timeout` (integer)
    Expiration date of bonuses or discounts

  - `data.expiration_timeout_unit` (string)
    The unit of measurement for the expiration date of bonuses or discounts
    Enum: "day", "week", "month", "year"

  - `data.expiration_notification_timeout` (integer)
    How many days before the bonus or discount expires, you need to send a notification to the client

  - `data.params_source_type` (string)
    Where to get the client's history to calculate the size of the bonus or discount (for accumulation promotions or conditional discounts)
    Enum: "loyalty_card", "active_companies", "chain"

  - `data.history_start_date` (string)
    From what date to take into account the client's history to calculate the size of the bonus or discount (for accumulative promotions or conditional discounts)

  - `data.on_changed_notification_template_id` (integer)
    Notification template ID when changing bonus or discount

  - `data.on_expiration_notification_template_id` (integer)
    Identifier of the notification template when a bonus or discount burns

  - `data.first_transaction_date` (string)
    Date of first stock transaction

  - `meta` (object)
    Metadata (contains the number of objects found)
    Example: {"count":1}

  - `meta.count` (integer)
    Number of objects found
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


