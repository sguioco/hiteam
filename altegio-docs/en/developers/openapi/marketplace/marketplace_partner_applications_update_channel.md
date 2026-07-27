# Update notification channel availability

Updates available notification channels for the application.

Note: Only for Chat Bots and SMS Aggregators category applications.
For marketplace partners only.

Endpoint: POST /marketplace/application/update_channel
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}

## Request fields (application/json):

  - `salon_id` (integer, required)
    Location ID
    Example: 123

  - `application_id` (integer, required)
    Application ID
    Example: 456

  - `channel_slug` (string, required)
    Channel to update availability for
    Enum: "sms", "whatsapp"

  - `is_available` (boolean, required)
    Channel availability flag
    Example: true

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)

  - `meta` (array)

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)

  - `meta.errors` (object)


