# Update Tag (Deprecated) (deprecated)

Deprecated: Use PUT /api/v2/companies/{company_id}/tags/{tag_id} instead.

Endpoint: PUT /labels/{location_id}/{tag_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `tag_id` (number, required)
    Tag ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `title` (string)
    name of tag
    Example: "Testway2"

  - `color` (string)
    Tag color in #RRGGBB format
    Example: "#aa11ff"

  - `entity` (number)
    Tag type (1 - tag for customers, 2 - tag for appointments)
    Example: 2

  - `icon` (string)
    Icon name
    Example: "Test"

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
