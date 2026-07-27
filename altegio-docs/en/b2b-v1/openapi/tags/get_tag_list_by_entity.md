# Get location tags (Deprecated) (deprecated)

Deprecated: Use GET /api/v2/companies/{company_id}/tags?entity={entity} instead.
Returns tags for the specified entity type.

The entity parameter accepts string aliases:
- common - common tags
- client - client tags
- record - appointment/record tags
- activity - activity/event tags

> Legacy support: Numeric values (0, 1, 2, 3) are also accepted but string aliases are preferred.

Endpoint: GET /labels/{location_id}/{entity}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (integer, required)
    Location ID

  - `entity` (string, required)
    Tag type alias
    Enum: "common", "client", "record", "activity"

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status
    Example: true

  - `data` (array)
    Array of tag objects
    Example: [{"id":241625,"salon_id":68570,"title":"VIP client","color":"#ff2828","icon":"star","entity":1,"deleted":0,"not_editable":0},{"id":241626,"salon_id":68570,"title":"Regular client","color":"#009800","icon":"user","entity":1,"deleted":0,"not_editable":0}]

  - `data.id` (string)
    Tag ID

  - `data.salon_id` (string)
    Location ID

  - `data.title` (string)
    Tag name

  - `data.color` (string)
    Tag color in #RRGGBB format

  - `data.icon` (string)
    Icon name

  - `data.slug` (string)
    Tag slug

  - `data.entity` (string)
    Tag type (1 - client, 2 - appointment, 3 - event)

  - `data.deleted` (string)
    Delete mark (0 - active, 1 - deleted)

  - `data.not_editable` (string)
    Whether tag changes are allowed (0 - allowed, 1 - not allowed)

  - `data.font_color` (string)
    Font color in #RRGGBB format

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


