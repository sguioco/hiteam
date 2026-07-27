# Get location inventories

The location inventory object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Inventory ID |
| title | string | Title |
| for_services | number | 1 - if used for automatic write-off of consumables |
| for_sale | number | 1 - if the default inventory for selling products |
| comment | string | Description of the inventory |

Endpoint: GET /storages/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

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
    Example: [{"id":1,"title":"Consumables","for_service":1,"for_sale":0,"comment":"To account for consumables"},{"id":2,"title":"Products","for_service":0,"for_sale":1,"comment":"To record store sales"},{"id":23061,"title":"Ors","for_service":0,"for_sale":1,"comment":"Nz"}]

  - `data.id` (number)
    Inventory ID

  - `data.title` (string)
    Inventory name

  - `data.for_service` (number)
    1 - if used for automatic write-off of consumables

  - `data.for_sale` (number)
    1 - if the default inventory for selling products

  - `data.comment` (string)
    Description of the inventory

  - `data.weight` (number)
    Sort order weight

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


