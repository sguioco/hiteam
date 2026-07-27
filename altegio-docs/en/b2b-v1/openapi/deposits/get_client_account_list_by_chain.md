# Get a list of client accounts by chain and a set of filters

Endpoint: GET /deposits/chain/{chain_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `chain_id` (number, required)
    Chain ID

## Query parameters:

  - `balance_from` (number)
    Minimum balance for filtering

  - `balance_to` (number)
    Maximum balance for filtering

  - `page` (number)
    Page number

  - `limit` (number)
    Number of items per page

## Header parameters:

  - `Accept` (string)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

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


## Response 200 fields
