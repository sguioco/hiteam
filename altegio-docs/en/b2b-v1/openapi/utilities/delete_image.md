# Deleting images

The response object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| success | boolean | Deletion result |

Endpoint: DELETE /images/{entity}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    form-data

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Path parameters:

  - `entity` (string, required)
    entity name (team_member for team members, service for services)

## Request fields (multipart/form-data):

  - `image_group_id` (number, required)
    Image group ID to delete

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
