# Update membership type

Updates an existing membership type. You can update basic information
(title, cost, period) without modifying the service/category links.

Note: To preserve existing services, pass empty arrays for
services and service_categories fields.

Endpoint: PUT /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID
    Example: 1

  - `loyalty_membership_type_id` (integer, required)
    Membership type ID
    Example: 468039

## Request fields (application/json):

  - `title` (string, required)
    Membership type name
    Example: "Updated Fitness 10-pack"

  - `salon_group_id` (integer, required)
    Chain ID (API uses salon_group_id parameter name)
    Example: 1

  - `cost` (number, required)
    Subscription price
    Example: 550

  - `service_categories` (array, required)
    List of service category IDs. Pass empty array to preserve existing categories.
    Example: []

  - `is_united_balance` (boolean, required)
    Balance type: true = unified balance, false = separate balance

  - `united_balance_services_count` (integer, required)
    Number of visits for unified balance
    Example: 10

  - `location_ids` (array)
    List of location IDs where this membership type is available
    Example: [123,456]

  - `period` (integer)
    Validity period duration
    Example: 90

  - `period_unit_id` (integer)
    Period unit type: 1 = day, 2 = week, 3 = month, 4 = year
    Enum: 1, 2, 3, 4

  - `allow_freeze` (boolean)
    Whether membership can be frozen
    Example: true

  - `freeze_limit` (integer)
    Maximum total freeze period
    Example: 30

  - `freeze_limit_unit_id` (integer)
    Freeze period unit: 1 = day, 2 = week, 3 = month, 4 = year
    Enum: same as `period_unit_id` (4 values)

  - `service_price_correction` (boolean)
    Whether service price can be adjusted when using membership
    Example: true

  - `expiration_type_id` (integer)
    Activation type: 1 = on sale, 2 = on first use, 3 = from specific date
    Enum: 1, 2, 3

  - `is_allow_empty_code` (boolean)
    Personal vs shared subscription.
- true = personal (only purchaser can use)
- false = shared (multiple people can use with code)
    Example: true

  - `balance_edit_type_id` (integer)
    Balance adjustment permission: 0 = prohibited, 1 = only at sale location, 2 = at all locations
    Enum: 0, 1, 2

  - `is_online_sale_enabled` (boolean)
    Whether online sale is enabled

  - `online_sale_title` (string)
    Subscription title for online sale
    Example: "Updated Fitness Pack"

  - `online_sale_description` (string)
    Subscription description for online sale
    Example: "Updated description"

  - `online_sale_price` (number)
    Price for online sale
    Example: 500

  - `online_image` (string)
    Image URL for online sale
    Example: "https://example.com/images/updated.jpg"

  - `autoactivation_period` (integer)
    Maximum autoactivation period
    Example: 3

  - `autoactivation_time_in_days` (integer)
    Time units for autoactivation
    Example: 10

  - `autoactivation_time_unit_id` (integer)
    Autoactivation time unit: 1 = days, 2 = weeks, 3 = months, 4 = years
    Enum: same as `period_unit_id` (4 values)

  - `is_archived` (boolean)
    Whether membership type is archived

  - `services` (array)
    List of service IDs. Pass empty array to preserve existing services.
    Example: []

  - `availability` (array)
    Time-based availability rules. Empty array = available anytime.

  - `availability.week_days` (array)
    Days of week when rule applies: 1 = Monday, 7 = Sunday
    Example: [1,2,3]

  - `availability.intervals` (array)
    Time intervals when membership is valid

  - `availability.intervals.from` (integer)
    Interval start in seconds from midnight
    Example: 28800

  - `availability.intervals.to` (integer)
    Interval end in seconds from midnight
    Example: 64800

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)
    Chain-level membership type object

  - `data.id` (integer)
    Subscription type ID
    Example: 777

  - `data.salon_group_id` (integer)
    Chain ID where membership type is available
    Example: 333

  - `data.category_id` (integer,null)
    Category ID restriction (null if no category restriction)

  - `data.title` (string)
    Subscription type name
    Example: "10-visit subscription"

  - `data.period` (integer)
    Validity period (0 if not set)
    Example: 10

  - `data.period_unit_id` (integer)
    Period unit: 1 = day, 2 = week, 3 = month, 4 = year, 0 = not set
    Example: 3

  - `data.allow_freeze` (boolean)
    Whether freezing is allowed
    Example: true

  - `data.freeze_limit` (integer)
    Maximum total freeze period
    Example: 30

  - `data.freeze_limit_unit_id` (integer)
    Freeze period unit: 1 = day, 2 = week, 3 = month, 4 = year
    Example: 1

  - `data.is_booking_when_frozen_allowed` (boolean)
    Allow booking appointments when membership is frozen

  - `data.is_allow_empty_code` (boolean)
    Allow sale without code: true = personal membership, false = shared with code

  - `data.is_united_balance` (boolean)
    Balance type: true = unified, false = separate
    Example: true

  - `data.is_united_balance_unlimited` (boolean)
    Whether unified balance is unlimited

  - `data.is_code_required` (boolean)
    Whether activation code is required

  - `data.balance_edit_type_id` (integer)
    Balance edit type: 1 = editable, 2 = not editable
    Example: 1

  - `data.cost` (number)
    Subscription price
    Example: 1000

  - `data.chain_price_min` (number)
    Minimum price across chain locations
    Example: 1000

  - `data.chain_price_max` (number)
    Maximum price across chain locations
    Example: 1500

  - `data.is_chain` (boolean)
    Whether this is a chain-level membership type
    Example: true

  - `data.expiration_type_id` (integer)
    Activation type: 1 = on sale, 2 = on first use, 3 = from specific date
    Example: 1

  - `data.expiration_type_title` (string)
    Human-readable expiration type
    Example: "On sale"

  - `data.category` (object,null,string)
    Service category restriction (can be object, null, or string like "standard")

  - `data.weight` (integer)
    Sort order weight

  - `data.abonements_count` (integer)
    Number of active subscriptions of this type

  - `data.is_online_sale_enabled` (boolean)
    Online sale: true = enabled, false = disabled

  - `data.online_sale_title` (string)
    Title for online sale
    Example: "10-visit subscription"

  - `data.online_sale_description` (string)
    Description for online sale
    Example: "Sold online with discount"

  - `data.online_sale_price` (number)
    Price for online sale
    Example: 550

  - `data.service_price_correction` (boolean)
    Whether service price can be adjusted when applying membership
    Example: true

  - `data.united_balance_services_count` (integer)
    Number of visits for unified balance
    Example: 10

  - `data.autoactivation_time` (integer)
    Time units for autoactivation
    Example: 10

  - `data.autoactivation_time_unit_id` (integer)
    Autoactivation time unit: 1 = days, 2 = weeks, 3 = months, 4 = years
    Example: 1

  - `data.attached_location_ids` (array)
    List of location IDs attached to this membership type
    Example: [1,2,3]

  - `data.attached_salon_ids` (array)
    Alternative name for attached_location_ids
    Example: [1,2,3]

  - `data.online_sale_image` (string,null)
    Image URL for online sale
    Example: "https://example.com/images/subscription_type.png"

  - `data.is_archived` (boolean)
    Whether membership type is archived

  - `data.date_archived` (string,null)
    Date when membership type was archived

  - `data.availability` (array)
    Time-based availability rules
    Example: [{"week_days":[1,2,3],"intervals":[{"from":3600,"to":7200},{"from":10800,"to":14400}]},{"week_days":[6,7],"intervals":[{"from":36000,"to":72000}]}]

  - `data.availability.week_days` (array)
    Days of week: 1 = Monday, 7 = Sunday
    Example: [1,2,3]

  - `data.availability.intervals` (array)
    Time intervals (seconds from midnight)

  - `data.availability.intervals.from` (integer)
    Interval start
    Example: 3600

  - `data.availability.intervals.to` (integer)
    Interval end
    Example: 7200

  - `data.balance_container` (object)
    Container with attached services and/or categories and their balance

  - `data.balance_container.links` (array)

  - `data.balance_container.links.count` (integer)
    Number of visits for this service/category
    Example: 10

  - `data.balance_container.links.is_unlimited` (boolean)
    Whether count is unlimited

  - `data.balance_container.links.service` (object)
    Service details (if link is to a service)

  - `data.balance_container.links.service.id` (integer)
    Example: 45

  - `data.balance_container.links.service.is_category` (boolean)

  - `data.balance_container.links.service.category_id` (integer)
    Example: 90

  - `data.balance_container.links.service.title` (string)
    Example: "Service in location"

  - `data.balance_container.links.service.online_sale_title` (string)
    Online sale title for service

  - `data.balance_container.links.service.is_chain` (boolean)
    Whether service belongs to chain

  - `data.balance_container.links.service.chain_price_min` (number)
    Minimum service price across chain

  - `data.balance_container.links.service.chain_price_max` (number)
    Maximum service price across chain

  - `data.balance_container.links.service.category` (object)

  - `data.balance_container.links.service.category.id` (integer)
    Example: 90

  - `data.balance_container.links.service.category.is_category` (boolean)
    Example: true

  - `data.balance_container.links.service.category.category_id` (integer)
    Example: 1

  - `data.balance_container.links.service.category.title` (string)
    Example: "First service category in location"

  - `data.balance_container.links.service.category.online_sale_title` (string)
    Online sale title for category

  - `data.balance_container.links.service.category.is_chain` (boolean)
    Whether category belongs to chain

  - `data.balance_container.links.service.category.chain_price_min` (number)
    Minimum price across chain

  - `data.balance_container.links.service.category.chain_price_max` (number)
    Maximum price across chain

  - `data.balance_container.links.service.category.category` (any)
    - `id` (integer)
    - `category_id` (integer)
    - `is_category` (boolean)
    - `title` (string)
    - `online_sale_title` (string)

  - `data.balance_container.links.category` (object)
    Category details (if link is to a category)

  - `data.balance_container.links.category.id` (integer)
    Example: 91

  - `data.balance_container.links.category.is_category` (boolean)
    Example: true

  - `data.balance_container.links.category.category_id` (integer)
    Example: 1

  - `data.balance_container.links.category.title` (string)
    Example: "Second service category in location"

  - `data.balance_container.links.category.online_sale_title` (string)
    Online sale title for category

  - `data.balance_container.links.category.is_chain` (boolean)
    Whether category belongs to chain

  - `data.balance_container.links.category.chain_price_min` (number)
    Minimum price across chain

  - `data.balance_container.links.category.chain_price_max` (number)
    Maximum price across chain

  - `data.balance_container.links.category.category` (any)
    - `id` (integer)
    - `category_id` (integer)
    - `is_category` (boolean)
    - `title` (string)
    - `online_sale_title` (string)

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

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)

  - `meta.errors` (object)


