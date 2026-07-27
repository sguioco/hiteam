# Get location accounts

The location account object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Location account ID |
| title | string | Title |
| type | number | 1 - for non-cash payments, 0 for cash |
| comment | string | Description to the location account |

Endpoint: GET /accounts/{location_id}
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
    Example: [{"id":13881,"title":"Main location account","type":0,"comment":"Standing at the reception"},{"id":13882,"title":"Payment account","type":1,"comment":"For non-cash payments"},{"id":21961,"title":"Advances","type":0,"comment":""}]

  - `data.id` (number)
    Checkout ID

  - `data.title` (string)
    Location account name

  - `data.type` (number)
    1 - for non-cash payments, 0 for cash

  - `data.comment` (string)
    Description for checkout

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


