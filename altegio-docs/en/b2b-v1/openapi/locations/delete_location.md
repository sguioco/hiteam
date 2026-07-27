# Delete location

Delete a location.

Endpoint: DELETE /company/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 37532

## Header parameters:

  - `Accept` (string, required)
    Must be application/vnd.api.v2+json

  - `Content-Type` (string, required)
    Must be application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 401 fields (application/json):

  - `errors` (object)
    Additional response data.

  - `errors.code` (number)
    Error number.
    Example: 401

  - `errors.message` (string)
    Error message.
    Example: "Authentication needed"

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Authentication needed."

## Response 404 fields (application/json):

  - `errors` (object)
    Additional response data.

  - `errors.code` (number)
    Error number.
    Example: 404

  - `errors.message` (string)
    Error message.
    Example: "Not found"

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Not found"


## Response 202 fields
