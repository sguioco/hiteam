# Update Online Booking User Data

Updating a team member’s data in online booking.

 When updating a phone number, the confirmation_code field must be included in the request. This code should be obtained using the [SMS confirmation code of the phone number to change
data](#operation/Send%20SMS%20code%20confirmation%20number%20phone%20for%20change%20data)

Endpoint: PUT /booking/user
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

## Request fields (application/json):

  - `name` (string)
    Name
    Example: "James Smith"

  - `email` (string)
    mail
    Example: "j.smith@example.com"

  - `phone` (string)
    Phone number
    Example: "+13155550175"

  - `confirmation_code` (string)
    SMS confirmation code (when changing phone number)
    Example: "1234"

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


## Response 202 fields
