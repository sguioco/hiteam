# Delete Booking Widget

Endpoint: DELETE /company/{location_id}/booking_forms/{form_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `form_id` (number, required)
    appointment widget ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

  - `Content-Type` (string, required)
    application/json

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


## Response 204 fields
