# Edit Chain Promotion

Endpoint: PUT /chain/{chain_id}/loyalty/programs/{loyalty_program_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID

  - `loyalty_program_id` (integer, required)
    Promotion ID

## Query parameters:

  - `include` (string)
    Include additional resources in the answer
    Enum: "applicable_items", "rules", "companies", "loyalty_card_types", "on_changed_notification_template", "on_expiration_notification_template"

## Request fields (application/json):

  - `title` (string)
    Share name
    Example: "Cumulative discount for some services and not for goods"

  - `usage_limit` (integer)
    Limit on the number of applications (only for cashback)

  - `expiration_timeout` (integer)
    Expiration date of bonuses or discounts
    Example: 6

  - `expiration_timeout_unit` (string)
    The unit of measurement for the expiration date of bonuses or discounts
    Enum: "day", "week", "month", "year"

  - `expiration_notification_timeout` (integer)
    How many days before the bonus or discount expires, a notification must be sent to the client
    Example: 7

  - `loyalty_card_type_ids` (array)
    Identifiers of types of cards for which the promotion is valid
    Example: [51,29]

  - `on_changed_notification_template` (object)
    Body of the request to bind the loyalty notification template
    Example: {"type":"custom","body":"Your discount has changed"}

  - `on_changed_notification_template.type` (string)
    Template option
    Enum: "none", "big", "mid", "small", "custom"

  - `on_changed_notification_template.body` (string)
    Template text (custom only)
    Example: "Your discount has changed"

  - `on_expiration_notification_template` (object)
    Body of the request to bind the loyalty notification template
    Example: {"type":"big"}

  - `rules` (array)
    Rules for determining the value of the bonus or discount (only one rule is allowed for fixed promotions)
    Example: [{"parameter":10,"value":2.5,"service_id":0},{"parameter":30,"value":7.5,"service_id":0}]

  - `rules.parameter` (integer)
    Rule Threshold (0 for Fixed Stock Types)
    Example: 10

  - `rules.value` (number)
    The value of the discount or bonus
    Example: 2.5

  - `rules.service_id` (integer)
    Service ID (only for "Discount by condition" promotion)

  - `company_ids` (array)
    Identifiers of locations where the promotion is valid
    Example: [49]

  - `allowed_service_ids` (array)
    Service and service category identifiers (if application type is set for some services)
    Example: [53,92]

  - `allowed_good_ids` (array)
    Item IDs (if application type is set for some items)
    Example: []

  - `allowed_good_category_ids` (array)
    Product category identifiers (if application type is set for some products)
    Example: []

## Response 200 fields (application/json):

  - `id` (integer)
    Stock ID
    Example: 34

  - `title` (string)
    Share name
    Example: "Cumulative discount for some services and not for goods"

  - `type` (string)
    Promotion type
    Enum: "discount_static", "discount_accumulative_visits", "discount_accumulative_sold", "discount_accumulative_paid", "cashback_static_sold", "cashback_static_paid", "cashback_accumulative_paid", "cashback_accumulative_sold", "cashback_accumulative_paid_visits", "cashback_accumulative_sold_visits", "cashback_sold_visits", "cashback_paid_visits", "package_discount"

  - `service_item_type` (string)
    Type of application to services
    Enum: "any_allowed", "not_allowed", "custom_allowed"

  - `good_item_type` (string)
    Type of application to products
    Enum: same as `service_item_type` (3 values)

  - `value_unit` (string)
    Bonus or discount measurement unit (percentage, fixed amount)
    Enum: "percent", "amount"

  - `usage_limit` (integer)
    Limit on the number of applications (only for cashback)

  - `visit_multiplicity` (integer)
    Multiplicity of application by visits (only for cashback)

  - `sold_items_multiplicity` (integer)
    How many services you need to pay to get a discount on promotional services (only for the type of promotion "Discount by condition")

  - `expiration_timeout` (integer)
    Expiration date of bonuses or discounts
    Example: 6

  - `expiration_timeout_unit` (string)
    The unit of measurement for the expiration date of bonuses or discounts
    Enum: same as `expiration_timeout_unit` (4 values)

  - `expiration_notification_timeout` (integer)
    How many days before the bonus or discount expires, a notification must be sent to the client
    Example: 7

  - `params_source_type` (string)
    Where to get the client's history to calculate the size of the bonus or discount (for accumulation promotions or conditional discounts)
    Enum: "loyalty_card", "active_companies", "chain"

  - `history_start_date` (string)
    From what date to take into account the client's history to calculate the size of the bonus or discount (for accumulative promotions or conditional discounts)
    Example: "2026-09-21"

  - `on_changed_notification_template_id` (integer)
    Notification template ID when changing bonus or discount
    Example: 55

  - `on_expiration_notification_template_id` (integer)
    Identifier of the notification template when a bonus or discount burns
    Example: 84

  - `loyalty_card_types` (array)
    Type of cards for which the promotion is valid (on request)
    Example: [{"id":51,"title":"Card type 1"},{"id":29,"title":"Card type 2"}]

  - `loyalty_card_types.id` (integer)
    Card type identifier
    Example: 123

  - `loyalty_card_types.title` (string)
    Card type name
    Example: "Loyalty card type"

  - `on_changed_notification_template` (object)
    Loyalty notification template
    Example: {"id":55,"type":"custom","body":"Your discount has changed","message_type":"loyalty_discount_changed"}

  - `on_changed_notification_template.id` (integer)
    Template ID
    Example: 55

  - `on_changed_notification_template.type` (string)
    Template option
    Enum: "big", "mid", "small", "custom"

  - `on_changed_notification_template.body` (string)
    Template text
    Example: "Your discount has changed"

  - `on_changed_notification_template.message_type` (string)
    Message type
    Enum: "loyalty_discount_expiration", "loyalty_cashback_expiration", "loyalty_discount_increased", "loyalty_discount_decreased", "loyalty_card_created", "loyalty_card_withdraw", "loyalty_withdraw_cancelled", "loyalty_card_manual", "loyalty_card_manual_withdraw", "loyalty_card_cashback", "loyalty_card_cashback_cancelled", "loyalty_card_income", "loyalty_discount_changed", "loyalty_cashback_changed", "loyalty_settings_abonement_notification"

  - `on_expiration_notification_template` (object)
    Loyalty notification template
    Example: {"id":84,"type":"big","body":"Detailed text about discount burning","message_type":"loyalty_discount_expiration"}

  - `rules` (array)
    Rules for determining the value of the bonus or discount (only one rule is allowed for fixed promotions) (on request)
    Example: [{"id":94,"parameter":10,"value":2.5,"loyalty_program_id":34,"loyalty_type_id":3,"service_id":0},{"id":74,"parameter":30,"value":7.5,"loyalty_program_id":34,"loyalty_type_id":3,"service_id":0}]

  - `rules.id` (integer)
    Rule ID
    Example: 34

  - `rules.parameter` (integer)
    Rule Threshold (0 for Fixed Stock Types)

  - `rules.value` (number)
    The value of the discount or bonus
    Example: 3.5

  - `rules.loyalty_program_id` (integer)
    Loyalty promotion ID
    Example: 123

  - `rules.loyalty_type_id` (integer)
    Loyalty promotion type ID
    Example: 5

  - `rules.service_id` (integer)
    Service ID (only for "Discount by condition" promotion)

  - `companies` (array)
    Locations where the promotion is valid (on request)
    Example: [{"id":49,"title":"Location","country":"United States","country_id":5,"city":"New York","city_id":83,"phone":"+13155550175","timezone":"America/New_York","address":"Location address","coordinate_lat":40.73061,"coordinate_lng":18.63}]

  - `companies.address` (string, required)
    location address

  - `companies.city` (string, required)
    Name of the city where the organization is located

  - `companies.city_id` (number, required)
    City ID

  - `companies.coordinate_lat` (number, required)
    Latitude

  - `companies.coordinate_lng` (number, required)
    Longitude

  - `companies.country` (string, required)
    The name of the country in which the organization is located

  - `companies.country_id` (number, required)
    Country ID

  - `companies.id` (number, required)
    location ID

  - `companies.phone` (string, required)
    location phone

  - `companies.timezone` (string, required)
    location time zone

  - `companies.title` (string, required)
    Name of the organization

  - `applicable_items` (array)
    Related entities for selective application of the promotion (on request)
    Example: [{"id":53,"title":"Service category 1","is_service":true,"is_category":true},{"id":92,"title":"Service category 2","is_service":true,"is_category":true}]

  - `applicable_items.id` (integer)
    Related entity ID
    Example: 234

  - `applicable_items.title` (string)
    Related entity name
    Example: "Product category"

  - `applicable_items.is_service` (boolean)
    Flag: true - service/category of services, false - product/category of products

  - `applicable_items.is_category` (boolean)
    Flag: true - service/product category, false - service/product
    Example: true


## Response 422 fields
