# Retrieving Appointment Calendar Settings

Endpoint: GET /company/{location_id}/settings/timetable
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

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Example: {"record_type":0,"activity_record_clients_count_max":1}

  - `data.activity_record_clients_count_max` (integer, required)
    Maximum number of seats in one group event
    Example: 1

  - `data.record_type` (integer, required)
    Default appointment type: 0 - Mixed appointment, 1 - Individual appointment, 2 - Group event

  - `data.is_show_newsletter_agreement` (boolean)
    Show newsletter subscription agreement checkbox in booking form

  - `data.is_show_personal_data_processing_agreement` (boolean)
    Show personal data processing agreement checkbox in booking form

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


