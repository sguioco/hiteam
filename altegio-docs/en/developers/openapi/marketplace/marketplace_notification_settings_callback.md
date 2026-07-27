# Application Installation for a Location

The integration settings of the partner service must be sent to this address. Once received, the application will be configured and installed for the corresponding location.

Endpoint: POST /marketplace/partner/callback
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Request fields (application/json):

  - `salon_id` (number, required)
    Location ID.
    Example: 123

  - `application_id` (number, required)
    Application ID.
    Example: 123

  - `api_key` (number)
    API-key for messaging module.
    Example: "2f181e2a-5c22-4ae7-9d9b-07104f312c28"

  - `webhook_urls` (array)
    Webhooks array
    Example: ["https://example.com/webhook"]

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

## Response 422 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "An error has occurred."

  - `meta.errors` (array)
    Set of a validation error messages.


## Response 201 fields
