# Obtaining chains available to the user

The location chain object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Location chain ID |
| title | string | Location chain name |
| locations | array | List of chain locations |
| access | object | Object with access rights for chain management |

Endpoint: GET /groups
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

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
    Example: [{"id":509,"title":"Chain of salons in New York","companies":[{"id":38726,"title":"Location in New York"},{"id":39287,"title":"Location in New York"}],"access":{"settings_access":"1","clients_access":"1","users_access":"1","loyalty_access":"1","loyalty_cards_manual_transactions_access":"1","chain_services_access":"1"}},{"id":508,"title":"Chain of salons in New York","companies":[{"id":38545,"title":"Location in New York"},{"id":38704,"title":"Location in New York"}],"access":{"settings_access":"1","clients_access":"1","users_access":"1","loyalty_access":"1","loyalty_cards_manual_transactions_access":"1","chain_services_access":"1"}}]

  - `data.id` (number)
    Chain ID

  - `data.title` (string)
    Chain name

  - `data.companies` (array)
    Chain locations

  - `data.companies.id` (number)
    location ID

  - `data.companies.title` (string)
    location name

  - `data.companies.public_title` (string)
    Public-facing location name

  - `data.companies.business_group_id` (number)
    Business group ID

  - `data.companies.business_type_id` (number)
    Business type ID

  - `data.companies.country_id` (number)
    Country ID

  - `data.companies.city_id` (number)
    City ID

  - `data.companies.timezone` (number)
    Timezone ID

  - `data.companies.timezone_name` (string)
    Timezone name

  - `data.companies.address` (string)
    Physical address

  - `data.companies.currency_short_title` (string)
    Currency code

  - `data.companies.coordinate_lat` (number)
    Latitude coordinate

  - `data.companies.coordinate_lon` (number)
    Longitude coordinate

  - `data.companies.logo` (string)
    Logo URL

  - `data.companies.zip` (string)
    ZIP/postal code

  - `data.companies.phone` (string)
    Phone number

  - `data.companies.phones` (array)
    Phone numbers

  - `data.companies.site` (string)
    Website URL

  - `data.companies.allow_delete_record` (boolean)
    Allow deleting records

  - `data.companies.allow_change_record` (boolean)
    Allow changing records

  - `data.access` (object)
    User access rights on the chain

  - `data.access.settings_access` (number)
    1 - there is access to the settings section, 0 - no access

  - `data.access.clients_access` (number)
    1 - there is access to the client base, 0 - no access

  - `data.access.deposits_access` (number)
    1 - there is access to client accounts, 0 - no access

  - `data.access.deposit_types_access` (number)
    1 - there is access to client account types, 0 - no access

  - `data.access.users_access` (number)
    1 - there is access to user management, 0 - no access

  - `data.access.loyalty_access` (number)
    1 - there is access to loyalty, 0 - no access

  - `data.access.loyalty_abonement_types_access` (number)
    1 - there is access to membership types, 0 - no access

  - `data.access.loyalty_abonement_balance_edit_access` (number)
    1 - there is access to edit membership balance, 0 - no access

  - `data.access.loyalty_abonement_period_edit_access` (number)
    1 - there is access to edit membership period, 0 - no access

  - `data.access.loyalty_abonement_history_access` (number)
    1 - there is access to membership history, 0 - no access

  - `data.access.loyalty_cards_manual_transactions_access` (number)
    1 - there is access to manual replenishment/withdrawal from loyalty cards, 0 - no access

  - `data.access.loyalty_certificate_types_access` (number)
    1 - there is access to certificate types, 0 - no access

  - `data.access.loyalty_programs_access` (number)
    1 - there is access to loyalty programs, 0 - no access

  - `data.access.network_services_access` (number)
    1 - there is access to chain services management, 0 - no access

  - `data.access.analytics_access` (number)
    1 - there is access to analytics, 0 - no access

  - `meta` (array)
    Metadata (empty array)

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


