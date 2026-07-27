# Authorize Online Booking User

When a user of an online account changes their password, their API key will change and a new authorization will be required

| Attribute | Type | Description |
| ------------- | ------------- | ------------- |
| login | string | The visitor's phone number in the format +13155550175, or their email address. |
| password | string | Visitor password |

Endpoint: POST /booking/auth
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

  - `id` (integer)
    User ID
    Example: 123456

  - `user_token` (string)
    User_token of the user
    Example: "wec23fh8cDfFV4432fc352456"

  - `name` (string)
    Username
    Example: "James Smith"

  - `phone` (string)
    User phone
    Example: "+13155550175"

  - `login` (string)
    User login
    Example: "j.smith"

  - `email` (string)
    User mailing address
    Example: "j.smith@example.com"

  - `avatar` (string)
    Path to the user's avatar file
    Example: "https://assets.alteg.io/general/0/01/123456789098765_12345678909876.png"

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


