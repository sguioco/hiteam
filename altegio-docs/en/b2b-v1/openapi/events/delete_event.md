# Deprecated. Delete Event (deprecated)

This endpoint is deprecated. Use DELETE /v2/locations/{location_id}/events/{event_id} instead.

Migration: The V2 Events API provides JSON:API formatted responses. See operation delete_event for details.

Endpoint: DELETE /activity/{location_id}/{event_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `event_id` (integer, required)
    Event ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

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


## Response 202 fields
