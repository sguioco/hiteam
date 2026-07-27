# Change membership validity period

Modifies the validity period (duration) of a subscription (membership).

This changes how long the subscription remains active before expiring.

Period units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

Use cases:
- Extend expiration as customer service gesture
- Adjust period after policy changes
- Correct administrative errors

Note: Requires chain-level permissions.

Endpoint: POST /chain/{chain_id}/loyalty/abonements/{membership_id}/set_period
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

  - `period` (integer, required)
    Duration value
    Example: 90

  - `period_unit_id` (integer, required)
    Period unit: 1 = day, 2 = week, 3 = month, 4 = year
    Enum: 1, 2, 3, 4

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `data.id` (integer)
    Example: 123

  - `data.period` (integer)
    Updated period duration
    Example: 90

  - `data.period_unit_id` (integer)
    Period unit type
    Example: 1

  - `data.expiration_date` (string)
    New expiration date
    Example: "2026-03-31T23:59:59+00:00"

  - `meta` (array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Cannot change period"

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
    Example: "Invalid period unit"


