# Change membership balance

Modifies the remaining visit count for a subscription (membership).

For unified balance subscriptions:
- Use united_balance_services_count to set total visits

For separate balance subscriptions:
- Use services_balance_count array with service_id and balance for each service/category

Use cases:
- Adjust balance after administrative changes
- Correct errors in visit counts
- Add bonus visits

Note: Requires chain-level permissions.

Endpoint: POST /chain/{chain_id}/loyalty/abonements/{membership_id}/set_balance
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
    Example: 706028

  - `membership_id` (integer, required)
    Membership ID
    Example: 123

## Request fields (application/json):

  - `united_balance_services_count` (integer)
    New visit count for unified balance subscriptions
    Example: 10

  - `services_balance_count` (array)
    New balance for separate balance subscriptions (per service/category)
    Example: [{"service_id":13160808,"balance":5},{"service_id":13160809,"balance":3}]

  - `services_balance_count.service_id` (integer, required)
    Service or category ID
    Example: 13160808

  - `services_balance_count.balance` (integer, required)
    New visit count for this service/category
    Example: 5

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `data.id` (integer)
    Example: 123

  - `data.united_balance_services_count` (integer)
    Example: 10

  - `data.balance_container` (object)
    Updated balance details

  - `meta` (array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Cannot change balance"

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
    Example: "Invalid service ID"


