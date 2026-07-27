# Get User Memberships

Returns a list of memberships of an authorized user

Endpoint: GET /user/loyalty/abonements
Version: 1.0.0
Security: BearerPartner

## Query parameters:

  - `company_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":659878,"number":788376,"balance_string":"Surfing (x10)","is_frozen":false,"freeze_period":0,"period":9999,"period_unit_id":3,"status":{"id":1,"title":"Released","extended_title":"Released"},"balance_container":{"links":[{"count":10,"category":{"id":3129591,"category_id":1,"title":"Surfing"}}]},"type":{"id":97804,"salon_group_id":145071,"title":89999,"period":9999,"period_unit_id":3,"allow_freeze":false,"freeze_limit":0,"is_allow_empty_code":false,"is_united_balance":false,"united_balance_services_count":0,"balance_container":{"links":[{"count":10,"category":{"id":3129591,"category_id":1,"title":"Surfing"}}]}}}]

  - `data.id` (integer)
    Membership ID

  - `data.number` (string)
    Subscription code

  - `data.balance_string` (string)
    Service name, with number of uses

  - `data.is_frozen` (boolean)
    Is the membership frozen?

  - `data.freeze_period` (integer)
    The period the membership was frozen

  - `data.period` (integer)
    Subscription expiration value

  - `data.period_unit_id` (integer)
    Identifier of the expiration units. 1 - day, 2 - week, 3 - month, 4 - year

  - `data.expiration_date` (string,null)
    Subscription expiration date

  - `data.created_date` (string)
    Subscription creation date

  - `data.activated_date` (string,null)
    Subscription activation date

  - `data.is_united_balance` (boolean)
    Whether membership has unified balance

  - `data.is_united_balance_unlimited` (boolean)
    Whether unified balance is unlimited

  - `data.united_balance_services_count` (integer)
    Number of services for unified balance

  - `data.goods_transaction_id` (integer)
    Product transaction ID

  - `data.slug` (string)
    Subscription type slug

  - `data.status` (object)
    Current membership status

  - `data.status.id` (integer)
    Status ID

  - `data.status.title` (string)
    Status name

  - `data.status.extended_title` (string)
    Full status name

  - `data.status.slug` (string)
    Status slug

  - `data.status.category` (string)
    Status category

  - `data.balance_container` (object)
    An object that includes the links array with information about the membership balance

  - `data.balance_container.links` (array)
    Array of services covered by the membership

  - `data.balance_container.links.count` (integer)
    Number of applications

  - `data.balance_container.links.is_unlimited` (boolean)
    Whether count is unlimited

  - `data.balance_container.links.service` (object)
    Service details

  - `data.balance_container.links.service.id` (integer)

  - `data.balance_container.links.service.category_id` (integer)

  - `data.balance_container.links.service.is_category` (boolean)

  - `data.balance_container.links.service.title` (string)

  - `data.balance_container.links.service.online_sale_title` (string)

  - `data.balance_container.links.service.is_chain` (boolean)

  - `data.balance_container.links.service.chain_price_min` (number)

  - `data.balance_container.links.service.chain_price_max` (number)

  - `data.balance_container.links.service.category` (object)

  - `data.balance_container.links.category` (object)
    Service category

  - `data.balance_container.links.category.id` (integer)
    Service ID

  - `data.balance_container.links.category.category_id` (integer)
    Service Category ID

  - `data.balance_container.links.category.title` (string)
    Service name

  - `data.balance_container.links.category.is_category` (boolean)

  - `data.balance_container.links.category.online_sale_title` (string)

  - `data.balance_container.links.category.is_chain` (boolean)

  - `data.balance_container.links.category.chain_price_min` (number)

  - `data.balance_container.links.category.chain_price_max` (number)

  - `data.balance_container.links.category.category` (object)

  - `data.type` (object)
    Object with information about membership type

  - `data.type.id` (integer)
    Membership type ID

  - `data.type.salon_group_id` (integer)
    Identifier of the chain in which the membership type is valid

  - `data.type.title` (string)
    Membership type name

  - `data.type.period` (integer)
    Subscription expiration date (0 if not set)

  - `data.type.period_unit_id` (integer)
    Subscription validity period unit (list of possible values, if not set - 0)

  - `data.type.allow_freeze` (boolean)
    Is it possible to freeze memberships? true - allowed, false - not allowed

  - `data.type.freeze_limit` (integer)
    Maximum total freezing period (days)

  - `data.type.freeze_limit_unit_id` (integer)
    Freeze period unit: 1 = day, 2 = week, 3 = month, 4 = year

  - `data.type.is_booking_when_frozen_allowed` (boolean)
    Allow booking when membership is frozen

  - `data.type.category_id` (integer,null)
    Category ID restriction

  - `data.type.is_allow_empty_code` (boolean)
    Allow the sale of a membership without a code? true - allow, false - do not allow

  - `data.type.is_united_balance` (boolean)
    Total or separate membership balance: true - total, false - separate

  - `data.type.united_balance_services_count` (integer)
    Number of visits for total balance

  - `data.type.is_united_balance_unlimited` (boolean)
    Whether unified balance is unlimited

  - `data.type.slug` (string)
    Subscription type slug

  - `data.type.is_code_required` (boolean)
    Whether activation code is required

  - `data.type.balance_edit_type_id` (integer)
    Balance edit permission level

  - `data.type.cost` (number)
    Subscription price

  - `data.type.is_archived` (boolean)
    Whether membership type is archived

  - `data.type.date_archived` (string,null)
    Date when archived

  - `data.type.expiration_type_id` (integer)
    Activation type: 1 = on sale, 2 = on first use, 3 = from specific date

  - `data.type.expiration_type_title` (string)
    Human-readable expiration type

  - `data.type.service_price_correction` (boolean)
    Whether service price can be adjusted

  - `data.type.is_online_sale_enabled` (boolean)
    Whether online sale is enabled

  - `data.type.online_sale_title` (string)
    Title for online sale

  - `data.type.online_sale_description` (string)
    Description for online sale

  - `data.type.online_sale_price` (number)
    Price for online sale

  - `data.type.autoactivation_time` (integer)
    Time units for autoactivation

  - `data.type.autoactivation_time_unit_id` (integer)
    Autoactivation time unit: 1 = days, 2 = weeks, 3 = months, 4 = years

  - `data.type.weight` (integer)
    Sort order weight

  - `data.type.category` (string)
    Subscription type category

  - `data.type.balance_container` (object)
    An object that includes the links array with information about the membership balance

  - `data.type.balance_container.links` (array)
    Array of services covered by the membership

  - `data.type.balance_container.links.count` (integer)
    Number of applications

  - `data.type.balance_container.links.is_unlimited` (boolean)
    Whether count is unlimited

  - `data.type.balance_container.links.service` (object)
    Service details

  - `data.type.balance_container.links.service.id` (integer)

  - `data.type.balance_container.links.service.category_id` (integer)

  - `data.type.balance_container.links.service.is_category` (boolean)

  - `data.type.balance_container.links.service.title` (string)

  - `data.type.balance_container.links.service.online_sale_title` (string)

  - `data.type.balance_container.links.service.is_chain` (boolean)

  - `data.type.balance_container.links.service.chain_price_min` (number)

  - `data.type.balance_container.links.service.chain_price_max` (number)

  - `data.type.balance_container.links.service.category` (object)

  - `data.type.balance_container.links.category` (object)
    Service category

  - `data.type.balance_container.links.category.id` (integer)
    Service ID

  - `data.type.balance_container.links.category.category_id` (integer)
    Service Category ID

  - `data.type.balance_container.links.category.title` (string)
    Service name

  - `data.type.balance_container.links.category.is_category` (boolean)

  - `data.type.balance_container.links.category.online_sale_title` (string)

  - `data.type.balance_container.links.category.is_chain` (boolean)

  - `data.type.balance_container.links.category.chain_price_min` (number)

  - `data.type.balance_container.links.category.chain_price_max` (number)

  - `data.type.balance_container.links.category.category` (object)

  - `meta` (object)
    Metadata (contains the number of subscriptions found)
    Example: {"count":1}

  - `meta.count` (integer)
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


