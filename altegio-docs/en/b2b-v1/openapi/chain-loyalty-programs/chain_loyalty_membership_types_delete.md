# Delete membership type

Deletes a membership type from the chain.

Warning: This action cannot be undone. Active subscriptions using this type
may be affected.

Endpoint: DELETE /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}
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
    Example: 1

  - `loyalty_membership_type_id` (integer, required)
    Membership type ID to delete
    Example: 468039

## Response 204 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (null)

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

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)


