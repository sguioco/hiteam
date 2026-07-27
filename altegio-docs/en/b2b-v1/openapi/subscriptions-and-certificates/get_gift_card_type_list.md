# Get a List of Available Gift Card Types

A list of gift card types available at a location can be obtained by querying the location ID.
The list can be filtered by the name of the gift card type by passing the title parameter.
Pagination is supported, specified by the page and page_size parameters.

The list is an array of gift card types.


Gift card type has the following structure:

| Field                      | Type    | Description                                                                                                                        |
|----------------------------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| id                         | number  | Gift card type identifier                                                                                                          |
| title                      | string  | Gift card type name                                                                                                                |
| balance                    | number  | Gift card denomination                                                                                                           |
| is_multi                   | boolean | Write-off type: true - multiple write-off, false - single write-off                                                               |
| company_group_id           | number  | ID of the chain where the gift card type is valid                                                                                  |
| item_type_id               | number  | Application Constraint (list of possible values)                                                                                   |
| expiration_type_id         | number  | Expiration limit (list of possible values)                                                                                         |
| expiration_date            | string  | Fixed burn date in ISO8601 format (null if not set)                                                                                |
| expiration_timeout         | number  | Gift card validity period from the date of sale (0 if not set)                                                                     |
| expiration_timeout_unit_id | number  | The unit of measurement of the validity period of the gift card from the moment of sale (list of possible values, if not set - 0) |
| is_allow_empty_code        | boolean | Allow sale of gift card without code? true - allow, false - do not allow                                                           |


Gift Card Type Restriction

| Meaning | Description                     |
|---------|---------------------------------|
| 0       | Unlimited                       |
| 1       | Any services without products   |
| 2       | Any products without services   |
| 3       | Some services without products  |
| 4       | Some services and any products  |


Gift Card Type Expiration Limit

| Meaning | Description                            |
|---------|----------------------------------------|
| 0       | No expiration date                     |
| 1       | Fixed date for all instances           |
| 2       | Fixed period of validity from the date of sale |


Units of certificate type validity period

| Meaning | Description |
|---------|-------------|
| 1       | Day         |
| 2       | Week        |
| 3       | Month       |
| 4       | Year        |

Endpoint: GET /company/{location_id}/loyalty/certificate_types/search
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (integer, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `title` (string)
    Gift card type name

  - `page` (number)
    Page number

  - `page_size` (number)
    The number of output lines per page. Maximum 100

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":1,"title":"Fixed burn date certificate without application restrictions","balance":10,"is_multi":true,"company_group_id":12,"item_type_id":0,"expiration_type_id":1,"expiration_date":"2026-09-21T23:00:00.000-05:00","expiration_timeout":0,"expiration_timeout_unit_id":0,"is_allow_empty_code":true},{"id":11,"title":"Certificate valid for 6 months from the date of sale for any goods without services","balance":100,"is_multi":false,"company_group_id":12,"item_type_id":2,"expiration_type_id":2,"expiration_timeout":6,"expiration_timeout_unit_id":3,"is_allow_empty_code":false}]

  - `data.id` (number)
    Certificate type identifier

  - `data.title` (string)
    Gift card type name

  - `data.balance` (number)
    Certificate denomination

  - `data.is_multi` (boolean)
    Write-off type: true - multiple write-off, false - single write-off

  - `data.company_group_id` (number)
    ID of the chain where the certificate type is valid

  - `data.item_type_id` (number)
    Application restriction (list of possible values)

  - `data.expiration_type_id` (number)
    Expiration limit (list of possible values)

  - `data.expiration_date` (string)
    Fixed burn date in ISO8601 format (null if not set)

  - `data.expiration_timeout` (number)
    Certificate validity period from the date of sale (0 if not set)

  - `data.expiration_timeout_unit_id` (number)
    The unit of measurement of the validity period of the certificate from the moment of sale (the list of possible values, if not specified - 0)

  - `data.is_allow_empty_code` (boolean)
    Allow sale of certificate without code? true - allow, false - do not allow

  - `meta` (object)
    Metadata (contains the number of certificate types found)
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


