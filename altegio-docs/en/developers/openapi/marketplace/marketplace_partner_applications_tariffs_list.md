# Get application tariffs

Retrieves list of tariffs for the application.

Note: For marketplace partners only.

Endpoint: GET /marketplace/application/{application_id}/tariffs
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}

## Path parameters:

  - `application_id` (integer, required)
    Application ID
    Example: 123

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (array)
    List of tariffs

  - `data.id` (integer)
    Tariff ID
    Example: 89

  - `data.title` (string)
    Tariff name
    Example: "1 month"

  - `data.options` (array)
    Tariff options

  - `data.options.id` (integer)
    Option ID
    Example: 123

  - `data.options.title` (string)
    Option name
    Example: "Solo professional"

  - `data.options.overall_price` (number)
    Total price
    Example: 500

  - `data.options.duration_in_months` (integer)
    Duration in months
    Example: 1

  - `data.options.currency_iso` (string)
    Currency ISO code
    Example: "USD"

  - `data.options.staff_amount` (integer)
    Maximum team members for this option
    Example: 1

  - `data.options.free_period_in_months` (integer)
    Free trial period in months

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


