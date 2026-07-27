# Get a List of Available Membership Types

A list of membership types available at a location can be obtained by requesting the location ID.
The list can be filtered by membership type name by passing the title parameter. Pagination is supported, specified by the page and page_size parameters.

The list is an array of membership types.


Membership type has the following structure:

| Field                          | Type    | Description                                                                                                          |
|-------------------------------|---------|----------------------------------------------------------------------------------------------------------------------|
| id                            | number  | Membership type identifier                                                                                           |
| title                         | string  | Membership type name                                                                                               |
| allow_freeze                  | boolean | Is it possible to freeze memberships? true - allowed, false - not allowed                                            |
| freeze limit                  | number  | Maximum total freezing period (days)                                                                                 |
| salon_group_id                | number  | Identifier of the chain in which the membership type is valid                                                        |
| period                        | number  | Membership expiration date (0 if not set)                                                                            |
| period_unit_id                | number  | Membership expiration unit (list of possible values, if not set - 0)                                               |
| is_allow_empty_code           | boolean | Allow the sale of a membership without a code? true - allow, false - do not allow                                    |
| is_united_balance             | boolean | Total or separate membership balance: true - total, false - separate                                                 |
| united_balance_services_count | number  | Number of visits for total balance                                                                                   |


Measurement units of membership type validity period

| Meaning | Description |
|---------|-------------|
| 1       | Day         |
| 2       | Week        |
| 3       | Month       |
| 4       | Year        |

Endpoint: GET /company/{location_id}/loyalty/abonement_types/search
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Conetnt-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `title` (string)
    Membeship type name

  - `page` (number)
    Page number

  - `page_size` (number)
    The number of output lines per page. Maximum 100

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array with data objects
    Example: [{"id":12233,"salon_group_id":123,"title":"Subscription with the possibility of freezing for 14 days","period":0,"period_unit_id":0,"allow_freeze":true,"freeze_limit":14,"is_allow_empty_code":false,"is_united_balance":false,"united_balance_services_count":0},{"id":255789,"salon_group_id":456,"title":"Subscription for 6 months","period":6,"period_unit_id":3,"allow_freeze":false,"freeze_limit":0,"is_allow_empty_code":false,"is_united_balance":false,"united_balance_services_count":0}]

  - `data.id` (number)
    Membership type ID

  - `data.salon_group_id` (number)
    Identifier of the chain in which the membership type is valid

  - `data.title` (string)
    Membership type name

  - `data.period` (number)
    Subscription expiration date (0 if not set)

  - `data.period_unit_id` (number)
    Subscription validity period unit (list of possible values, if not set - 0)

  - `data.allow_freeze` (boolean)
    Is it possible to freeze memberships? true - allowed, false - not allowed

  - `data.freeze_limit` (number)
    Maximum total freezing period (days)

  - `data.is_allow_empty_code` (boolean)
    Allow the sale of a membership without a code? true - allow, false - do not allow

  - `data.is_united_balance` (boolean)
    Total or separate membership balance: true - total, false - separate

  - `data.united_balance_services_count` (number)
    Number of visits for total balance

  - `meta` (object)
    Metadata (contains the number of membership types found)
    Example: {"count":2}

  - `meta.count` (integer)
    Example: 2

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


