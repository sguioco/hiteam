# List certificate types

Retrieves a list of certificate types at the chain level.

Returns all certificate types configured for the chain with optional filtering
and pagination.

Query Parameters:
- title - Filter by certificate type name (partial match)
- page - Page number (default: 1)
- page_size - Items per page (default: 10, max: 100)

Item Type Restrictions:
- 0 = All services and products
- 1 = Any services (no products)
- 2 = Any products (no services)
- 3 = Specific services only (no products)
- 4 = Specific services + any products

Expiration Types:
- 0 = No expiration
- 1 = Fixed date for all instances
- 2 = Fixed period from sale date

Expiration Units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

Endpoint: GET /chain/{chain_id}/loyalty/certificate_types
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

## Query parameters:

  - `title` (string)
    Filter by certificate type name (partial match)
    Example: "Gift"

  - `page` (integer)
    Page number
    Example: 1

  - `page_size` (integer)
    Items per page (max 100)
    Example: 10

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (array)

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

  - `meta` (object)

  - `meta.total_count` (integer)
    Total number of certificate types
    Example: 1

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)


