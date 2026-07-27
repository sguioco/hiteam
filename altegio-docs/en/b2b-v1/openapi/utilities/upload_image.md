# Image upload

The response object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| image_binded | boolean | Status of linking images to an entity |
| image_group | object | Image group object |

Endpoint: POST /images/{entity}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `entity` (string, required)
    entity name (team_member for team members, service for services)
    Example: "\"master\""

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    form-data

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (multipart/form-data):

  - `image` (string, required)
    transferred image (image/jpeg, image/png)

  - `company_id` (number)
    Location ID for image binding (for entity=service)

  - `service_id` (number)
    Service ID for image binding (for entity=service)

  - `master_id` (number)
    team member ID for image binding (for entity=team_member)

## Response 200 fields (application/json):

  - `image_group` (object, required)

  - `image_group.id` (number, required)
    image group id

  - `image_group.image_binded` (boolean, required)
    The status of linking images to an entity

  - `image_group.image_group` (object, required)
    Image group object

  - `image_group.images` (object, required)

  - `image_group.images.height` (number, required)
    Image Height

  - `image_group.images.id` (number, required)
    image id

  - `image_group.images.image_group_id` (number, required)
    Image group id

  - `image_group.images.path` (string, required)
    Image Path

  - `image_group.images.type` (string, required)
    Image type

  - `image_group.images.version` (string, required)
    Image version

  - `image_group.images.width` (number, required)
    Image Width

  - `image_group.entity` (string)
    The name of the entity to which the group is bound

  - `image_group.entity_id` (number)
    Entity ID

  - `ImageGroup` (object)

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


