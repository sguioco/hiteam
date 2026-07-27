# Send Email newsletter according to the list of clients

The object for creating an Email campaign has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| client_ids | array of numbers | Array of client IDs |
| text | string | Text Email Message |
| subject | string | Email Subject |

Endpoint: POST /email/clients/by_id/{location_id}
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

## Request fields (application/json):

  - `client_ids` (array, required)
    Array of client IDs
    Example: [1,2,3,4,5]

  - `subject` (string, required)
    Email Subject
    Example: "Important!"

  - `text` (string, required)
    Email text
    Example: "Dear clients, we congratulate you on being our clients! You are very lucky!"

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (string)
    Is null

  - `meta` (object)
    An object containing a 201 status code message
    Example: {"message":"Accepted"}

  - `meta.message` (string)
    Example: "Accepted"

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


