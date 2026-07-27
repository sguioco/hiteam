# Get certificate type

Retrieves a specific certificate type by ID at the chain level.

Returns complete certificate type configuration including expiration rules,
restrictions, and online sale settings.

Endpoint: GET /chain/{chain_id}/loyalty/certificate_types/{type_id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID
    Example: 706028

  - `type_id` (integer, required)
    Certificate type ID
    Example: 289056

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `data.id` (integer)
    Example: 289056

  - `data.title` (string)
    Example: "Gift Certificate 1000"

  - `data.balance` (number)
    Example: 1000

  - `data.is_multi` (boolean)
    Example: true

  - `data.company_group_id` (integer)
    Example: 706028

  - `data.category_id` (integer,null)

  - `data.weight` (integer)
    Example: 1

  - `data.item_type_id` (integer)

  - `data.expiration_type_id` (integer)
    Example: 2

  - `data.expiration_date` (string,null)

  - `data.expiration_timeout` (integer)
    Example: 6

  - `data.expiration_timeout_unit_id` (integer)
    Example: 3

  - `data.balance_edit_type_id` (integer)
    Example: 1

  - `data.is_allow_empty_code` (boolean)

  - `data.is_serial_number_limited` (boolean)

  - `data.is_archived` (boolean)

  - `data.date_archived` (string,null)

  - `data.online_sale_is_enabled` (boolean)

  - `data.online_sale_title` (string)
    Example: "Gift Certificate 1000"

  - `data.online_sale_description` (string)

  - `data.online_sale_price` (number)

  - `data.online_sale_image` (string,null)

  - `data.released_total` (integer)

  - `data.item_type` (object)

  - `data.item_type.id` (integer)

  - `data.item_type.title` (string)
    Example: "All services and products"

  - `data.service_ids` (array)
    Example: []

  - `data.salon_ids` (array)
    Example: [720441]

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


