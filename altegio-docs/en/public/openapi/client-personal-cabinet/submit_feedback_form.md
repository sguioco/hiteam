# Submit appointment review

Endpoint: POST /master_record_review/{record_token}
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `record_token` (string, required)
    Short appointment token

## Request fields (application/json):

  - `rating` (integer, required)
    Rating for the review (number of stars from 1 to 5)
    Example: 5

  - `text` (string)
    Feedback text
    Example: "Excellent service!"

  - `tips_amount` (number)
    Tip amount
    Example: 22.5

  - `redirect_prefix` (string)
    The prefix part of the url that will be redirected to after returning from the payment form
    Example: "https://n1.app.alteg.io"

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
