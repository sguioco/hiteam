# Getting Resources at a Location

Endpoint: GET /resources/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Query parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array with data objects
    Example: [{"id":70,"title":"Pedicure chair","instances":[{"id":181,"title":"Pedicure chair #1","resource_id":70}]},{"id":464,"title":"massage room","instances":[{"id":1094,"title":"Massage room 1st floor","resource_id":464},{"id":1162,"title":"Massage room 2nd floor","resource_id":464}]}]

  - `data.id` (number)
    Resource ID

  - `data.title` (string)
    Resource name

  - `data.instances` (array)
    Array of resource instances

  - `data.instances.id` (number)
    Resource instance ID

  - `data.instances.title` (string)
    Resource instance name

  - `data.instances.resource_id` (number)
    ID of the resource that owns the instance

  - `meta` (object)
    Metadata (contains the number of resources found)
    Example: {"count":2}

  - `meta.count` (integer)
    Example: 2

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


