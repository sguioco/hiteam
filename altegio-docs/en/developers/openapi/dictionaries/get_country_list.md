# Get a list of countries

Endpoint: GET /countries
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

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":7,"title":"USA","full_title":"United States","iso_code":"US","phone_code":"1","phone_template":"+1 xxx-xxx-xxxx","phone_example":"+1 201-123-4567","currency":"$","exchange":32.99,"lang_id":2,"group_type":1,"is_eu":false},{"id":56,"title":"France","full_title":"France","iso_code":"FR","phone_code":"33","phone_template":"+33 x xx xx xx xx","phone_example":"+33 1 23 45 67 89","currency":"€","exchange":11.18,"lang_id":8,"group_type":1,"is_eu":true}]

  - `data.id` (number)
    Country ID

  - `data.title` (string)
    Short country name

  - `data.full_title` (string)
    Full country name

  - `data.iso_code` (string)
    ISO 3166-1 alpha-2 country code

  - `data.phone_code` (string)
    Country phone code

  - `data.phone_template` (string)
    Country phone number mask

  - `data.phone_example` (string)
    Country phone number example

  - `data.currency` (string)
    Country currency symbol

  - `data.exchange` (number)
    Currency exchange rate

  - `data.lang_id` (number)
    Language ID

  - `data.group_type` (number)
    Country group type

  - `data.is_eu` (boolean)
    Whether the country is in the European Union

  - `meta` (array)
    Metadata (empty array)
    Example: []

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


