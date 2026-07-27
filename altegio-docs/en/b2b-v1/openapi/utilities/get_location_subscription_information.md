# Retrieve location subscription information

Endpoint: GET /license/{location_id}
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

## Path parameters:

  - `location_id` (number, required)
    location ID

## Response 200 fields (application/json):

  - `active` (number, required)
    Is the subscription active

  - `deactivation_date` (string, required)
    Subscription expiration date

  - `id` (number, required)
    Subscription ID

  - `is_paid_rights_model` (boolean, required)
    Whether the location uses paid rights licensing model

  - `name` (string, required)
    Subscription name

  - `options` (array, required)
    Subscription options

  - `salon_id` (number, required)
    location ID

  - `staff_limit` (number, required)
    team member limit

  - `start_date` (string, required)
    Subscription start date

  - `LicenseOption` (object)

  - `LicenseOption.id` (number, required)
    option id

  - `LicenseOption.title` (string, required)
    Option name

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


