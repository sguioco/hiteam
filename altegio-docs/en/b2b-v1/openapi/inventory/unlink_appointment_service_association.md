# Unlink Appointment-Service Association

Endpoint: DELETE /technological_cards/record_consumables/technological_cards/{location_id}/{record_id}/{service_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

  - `record_id` (number, required)
    Appointment ID

  - `service_id` (number, required)
    Service ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `delete_consumables` (number)
    Whether to remove consumables along with deleting bill of materials. Default 0

## Request fields (*/*):

  - `delete_consumables` (number)
    Whether to remove consumables along with deleting bill of materials. Default 0

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array with object
    Example: [{"service_id":7224099,"record_id":310013764,"technological_cards":[],"consumables":[]}]

  - `data.service_id` (number)
    Service ID

  - `data.record_id` (number)
    Appointment ID

  - `data.technological_cards` (array)
    Array of technological maps

  - `data.consumables` (array)
    Consumables

  - `meta` (object)
    Metadata (empty array0)
    Example: {"count":1}

  - `meta.count` (integer)
    Example: 1

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


