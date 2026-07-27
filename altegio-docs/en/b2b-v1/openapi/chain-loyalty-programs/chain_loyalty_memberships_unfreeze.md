# Unfreeze membership

Removes the freeze from a subscription (membership).

The subscription's expiration date will remain extended by the freeze period
that was already applied during the freeze.

Note: Requires chain-level permissions.

Endpoint: POST /chain/{chain_id}/loyalty/abonements/{membership_id}/unfreeze
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
    Membership ID to unfreeze
    Example: 123

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `data.id` (integer)
    Example: 123

  - `data.number` (string)
    Example: "123456"

  - `data.is_frozen` (boolean)

  - `data.freeze_period` (integer)
    Total freeze period that was applied (in days)
    Example: 14

  - `meta` (array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Subscription is not frozen"

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


