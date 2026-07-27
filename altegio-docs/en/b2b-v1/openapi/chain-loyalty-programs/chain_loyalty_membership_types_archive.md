# Archive or unarchive membership type

Archives or unarchives a membership type.

Archived membership types:
- Cannot be sold to new clients
- Existing active memberships remain functional
- Can be unarchived at any time

Note: Requires chain-level permissions.

Endpoint: PATCH /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}/archive
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
    Membership type ID
    Example: 489159

## Request fields (application/json):

  - `is_archived` (boolean, required)
    Archive status:
- true = archived (cannot be sold)
- false = active (available for sale)
    Example: true

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


## Response 204 fields
