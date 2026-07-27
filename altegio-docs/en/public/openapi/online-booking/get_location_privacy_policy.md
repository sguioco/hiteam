# Get location privacy policy for online booking

Retrieves the privacy policy configured for a specific location. This endpoint should be called before creating an online booking record to check if the location has a custom privacy policy.

If a location has a custom privacy policy configured, the online booking flow must:
- Display the policy text to the user
- Show a checkbox for accepting the privacy policy
- Only proceed with booking creation after the user has checked the acceptance checkbox

If no custom policy is configured for the location, the booking can proceed without showing any policy acceptance step.

Endpoint: GET /privacy_policy/{location_id}
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Path parameters:

  - `location_id` (number, required)
    location ID

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


## Response 200 fields
