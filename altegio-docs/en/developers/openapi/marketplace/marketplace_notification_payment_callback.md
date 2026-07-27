# Notify Altegio of Successful Payment

A webhook notification must be sent to this address to inform Altegio of a successful payment made on the partner service’s side.

Endpoint: POST /marketplace/partner/payment
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Request fields (application/json):

  - `salon_id` (number, required)
    Location ID.
    Example: 123

  - `currency_iso` (string, required)
    Currency ISO (e.g.: USD, EUR, BYN)
    Example: "EUR"

  - `application_id` (number, required)
    Application ID.
    Example: 123

  - `payment_sum` (number, required)
    Payment amount.
    Example: 990.99

  - `payment_date` (string, required)
    Date and time of payment.
    Example: "2022-01-01 10:10:00"

  - `period_from` (string, required)
    Date from which the paid period begins (inclusive).
    Example: "2022-01-01 10:10:00"

  - `period_to` (string, required)
    Date from which the paid period ends (inclusive).
    Example: "2022-02-01 10:10:00"

## Response 200 fields (application/json):

  - `success` (boolean)
    Status.
    Example: true

  - `data` (object)
    Data.

  - `data.id` (number)
    Payment ID
    Example: 123

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

## Response 422 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "An error has occurred."

  - `meta.errors` (array)
    Set of a validation error messages.


