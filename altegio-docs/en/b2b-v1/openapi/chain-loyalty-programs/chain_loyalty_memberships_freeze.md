# Freeze membership

Freezes a subscription (membership) until the specified date.

The subscription's expiration date will be extended by the freeze period.
Frozen subscriptions cannot be used for appointments.

Requirements:
- Membership type must have allow_freeze: true
- Freeze period must not exceed freeze_limit from membership type

Note: Requires chain-level permissions.

Endpoint: POST /chain/{chain_id}/loyalty/abonements/{membership_id}/freeze
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
    Membership ID to freeze
    Example: 123

## Request fields (application/json):

  - `freeze_till` (string, required)
    Date until which the membership will be frozen (ISO 8601 format)
    Example: "2026-12-31T23:59:59-05:00"

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `data.id` (integer)
    Example: 123

  - `data.number` (string)
    Example: "123456"

  - `data.is_frozen` (boolean)
    Example: true

  - `data.freeze_period` (integer)
    Total freeze period in days
    Example: 14

  - `data.freeze_till` (string)
    Date until which membership is frozen
    Example: "2026-12-31T23:59:59-05:00"

  - `meta` (array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Subscription cannot be frozen"

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
    Example: "Freeze period exceeds limit"

  - `meta.errors` (object)
    Validation errors by field


