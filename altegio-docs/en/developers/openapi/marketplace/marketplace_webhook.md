# Webhook from Altegio About Application Events

Note: This is not a callable endpoint.

This section describes how Altegio sends webhook notifications when specific events occur in the application-to-location lifecycle. The following event types are currently supported:

* uninstall — Sent when the application is disabled on the Altegio side.
* freeze — Sent when the integration is frozen due to service expiration.

You can configure the webhook URL for receiving these events in your Altegio Developer Account.

Endpoint: POST /marketplace_webhook
Version: 1.0.0

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

  - `event` (string, required)
    Event Slug.
    Enum: "uninstall", "freeze"

  - `partner_token` (string, required)
    Bearer token of the developer's location (to verify the origin of the webhook)
    Example: "yasdfkjah2328aj"

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
