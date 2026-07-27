# Update Online Booking Settings

Endpoint: PATCH /company/{location_id}/settings/online
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

  - `Content-Type` (string, required)
    application/json

## Path parameters:

  - `location_id` (number, required)
    location ID

## Request fields (application/json):

  - `activity_online_record_clients_count_max` (integer, required)
    Maximum number of seats in one group event
    Example: 1

  - `any_master` (boolean, required)
    "Any team member" mode
    Example: true

  - `confirm_number` (boolean, required)
    Confirm customer number via SMS

  - `seance_delay_step` (integer, required)
    Delay to the next session, in minutes from 0 to 23 hours (inclusive) in increments of 30 minutes
    Example: 90

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Online booking settings for a location
    Example: {"confirm_number":false,"any_master":true,"seance_delay_step":90,"activity_online_record_clients_count_max":1}

  - `data.activity_online_record_clients_count_max` (integer, required)
    Maximum number of seats in one group event
    Example: 1

  - `data.any_master` (boolean, required)
    "Any team member" mode
    Example: true

  - `data.confirm_number` (boolean, required)
    Confirm customer number via SMS

  - `data.seance_delay_step` (integer, required)
    Delay to the next session, in minutes from 0 to 23 hours (inclusive) in increments of 30 minutes
    Example: 90

  - `meta` (array)
    metadata
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


