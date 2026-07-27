# Update Position

Update a Position. The request must contain title.

Endpoint: PUT /locations/{company_id}/positions/{position_id}
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Request media type

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `company_id` (integer, required)
    Location ID

  - `position_id` (integer, required)
    Position ID

## Request fields (application/json):

  - `title` (string, required)
    Position title

  - `description` (string)
    Position description

## Response 400 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


## Response 204 fields
