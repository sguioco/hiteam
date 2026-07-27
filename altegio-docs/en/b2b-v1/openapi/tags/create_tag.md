# Create a Tag (Deprecated) (deprecated)

Deprecated: Use POST /api/v2/companies/{company_id}/tags instead.

Creates a new tag for the specified location.

Endpoint: POST /labels/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Query parameters:

  - `title` (string, required)
    Name of tag

  - `color` (string, required)
    Tag color in #RRGGBB format

  - `entity` (number)
    Tag type (0 - general tags, 1 - customer tags, 2 - appointment tags)

  - `icon` (string)
    Icon name

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
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"title":"test","salon_id":68570,"color":"#00ff11","entity":1,"id":3599560}

  - `data.title` (string)
    name of tag
    Example: "test"

  - `data.salon_id` (number)
    ID of the location that the tag belongs to
    Example: 68570

  - `data.color` (string)
    Tag color in #RRGGBB format
    Example: "#00ff11"

  - `data.entity` (number)
    Tag type (1 - tag for customers, 2 - tag for appointments)
    Example: 1

  - `data.id` (integer)
    Tag ID
    Example: 3599560

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


## Response 202 fields
