# Get Internationalization Options

Translation is available in one of the languages:
- Latvian - 'lv-LV'
- English - 'en-US'
- Estonian - 'ee-EE'
- Lithuanian - 'lt-LT'
- German - 'de-DE'
- Ukrainian - 'uk-UK'

Endpoint: GET /i18n/{lang_code}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `lang_code` (string, required)
    Language code. One of the set 'lv-LV', 'en-US', 'ee-EE', 'lt-LT', 'de-DE', 'uk-UK'
    Example: "en-US"

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

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


