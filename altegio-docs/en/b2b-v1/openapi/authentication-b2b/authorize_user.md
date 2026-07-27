# Authorize User

When a user changes their password, their API key is regenerated. As a result, reauthorization is required using the new API key.

| Attribute | Type | Description |
| ------------- | ------------- | ------------- |
| login | string | The user's phone number in the format +13155550175, or their email address.|
| password | string | User password |

Endpoint: POST /auth
Version: 1.0.0

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Request fields (application/json):

  - `login` (string, required)
    Phone number or Email
    Example: "testuser@alteg.io"

  - `password` (string, required)
    Password
    Example: "testpass"

## Response 201 fields (application/json):

  - `success` (boolean)
    Request success status
    Example: true

  - `data` (object)
    Example: {"id":123456,"user_token":"wec23fh8cDfFV4432fc352456","name":"James Smith","phone":"+13155550175","login":"j.smith","email":"j.smith@example.com","avatar":"https://assets.alteg.io/general/0/01/123456789098765_12345678909876.png","is_approved":true,"is_email_confirmed":false}

  - `data.id` (integer)
    User ID
    Example: 123456

  - `data.user_token` (string)
    User_token of the user
    Example: "wec23fh8cDfFV4432fc352456"

  - `data.name` (string)
    Username
    Example: "James Smith"

  - `data.phone` (string)
    User phone
    Example: "+13155550175"

  - `data.login` (string)
    User login
    Example: "j.smith"

  - `data.email` (string)
    User mailing address
    Example: "j.smith@example.com"

  - `data.avatar` (string)
    Path to the user's avatar file
    Example: "https://assets.alteg.io/general/0/01/123456789098765_12345678909876.png"

  - `data.is_approved` (boolean)
    Is the user verified in the system
    Example: true

  - `data.is_email_confirmed` (boolean)
    Is the user email confirmed

  - `meta` (array)
    Metadata
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


