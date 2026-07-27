# Get Online Booking User Data

Retrieve online booking user data.

Endpoint: GET /booking/user/data
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

  - `0` (string)
    User Token
    Example: "152afb01134237bc844d7e"

  - `id` (integer)
    User ID
    Example: 32132133

  - `user_token` (string)
    User Token
    Example: "152afb01134237bc844d7e"

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
    User mail
    Example: "j.smith@example.com"

  - `avatar` (string)
    User avatar
    Example: "https://api.alteg.io/images/avatar.png"

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


