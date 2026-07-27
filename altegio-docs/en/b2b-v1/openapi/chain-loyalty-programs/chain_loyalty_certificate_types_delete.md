# Delete certificate type

Deletes a certificate type from the chain.

Warning: This action cannot be undone. Certificate types that have
issued certificates cannot be deleted.

Endpoint: DELETE /chain/{chain_id}/loyalty/certificate_types/{type_id}
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
    Certificate type ID to delete
    Example: 289056

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (null)

  - `meta` (array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Cannot delete certificate type with issued certificates"

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


## Response 204 fields
