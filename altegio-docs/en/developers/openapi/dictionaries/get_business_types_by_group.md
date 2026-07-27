# Get business types by group

Endpoint: GET /references/business_groups_with_types
Version: 1.0.0
Security: BearerPartner

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

  - `data` (array)
    Array of objects with data
    Example: [{"id":10,"title":"Domestic services","image":"https://app.alteg.io/images/business-groups/services.png","types":[{"id":31,"title":"Studio","business_group_id":10}]},{"id":1,"title":"beauty","image":"https://app.alteg.io/images/business-groups/beauty.png","types":[{"id":1,"title":"Beauty Salons","business_group_id":1},{"id":25,"title":"Spa","business_group_id":1}]}]

  - `data.id` (number)
    Category ID

  - `data.title` (string)
    name of category

  - `data.image` (string)
    Group image

  - `data.image_small` (string)
    Group small image

  - `data.types` (array)
    Related business types

  - `data.types.id` (number)
    Type identifier

  - `data.types.title` (string)
    Type name

  - `data.types.business_group_id` (number)
    Business group ID

  - `meta` (object)
    Metadata (contains the number of business types found)
    Example: {"count":10}

  - `meta.count` (integer)
    Example: 10

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


