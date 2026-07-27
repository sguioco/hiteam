# Create certificate type

Creates a new certificate type at the chain level.

Certificate types define gift certificate templates that can be sold across multiple locations.

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

Balance Edit Types:
- 1 = Can be edited
- 2 = Cannot be edited

Note: After creation, certificate products are automatically created in inventory.

Endpoint: POST /chain/{chain_id}/loyalty/certificate_types
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

## Request fields (application/json):

  - `title` (string, required)
    Certificate type name
    Example: "Gift Certificate 1000"

  - `balance` (number, required)
    Certificate face value
    Example: 1000

  - `is_multi` (boolean, required)
    true = multiple use, false = single use
    Example: true

  - `item_type_id` (integer, required)
    Usage restrictions (0-4)
    Enum: 0, 1, 2, 3, 4

  - `is_allow_empty_code` (boolean, required)
    Allow selling without code?

  - `balance_edit_type_id` (integer, required)
    Balance editability (1 = editable, 2 = not editable)
    Enum: 1, 2

  - `service_ids` (array, required)
    Specific service IDs (empty if no restriction)
    Example: []

  - `salon_ids` (array, required)
    Location IDs where certificate is valid
    Example: [720441]

  - `expiration` (object, required)
    Expiration settings

  - `expiration.type_id` (integer, required)
    Expiration type: 0 = none, 1 = fixed date, 2 = period from sale
    Enum: 0, 1, 2

  - `expiration.date` (string)
    Fixed expiration date (ISO 8601, required if type_id = 1)
    Example: "2026-12-31T23:59:59+00:00"

  - `expiration.timeout` (integer)
    Duration value (required if type_id = 2)
    Example: 6

  - `expiration.timeout_unit_id` (integer)
    Duration unit (required if type_id = 2): 1 = day, 2 = week, 3 = month, 4 = year
    Enum: 1, 2, 3, 4

  - `online_sale` (object, required)
    Online sale settings

  - `online_sale.is_enabled` (boolean, required)
    Enable online purchase?

  - `online_sale.title` (string)
    Title for online store
    Example: "Gift Certificate"

  - `online_sale.description` (string)
    Description for online store
    Example: "Perfect gift for any occasion"

  - `online_sale.price` (number)
    Online sale price
    Example: 1000

  - `category_id` (integer,null)
    Service category restriction (null = no restriction)

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `data.id` (integer)
    Certificate type ID
    Example: 289056

  - `data.title` (string)
    Example: "Gift Certificate 1000"

  - `data.balance` (number)
    Example: 1000

  - `data.is_multi` (boolean)
    Example: true

  - `data.company_group_id` (integer)
    Chain ID
    Example: 706028

  - `data.category_id` (integer,null)

  - `data.weight` (integer)
    Sort order
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
    Total certificates issued

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

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "An error has occurred"

  - `meta.errors` (object)
    Field-specific validation errors

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)


