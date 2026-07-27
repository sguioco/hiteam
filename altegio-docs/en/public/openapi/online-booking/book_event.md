# Book Event

Endpoint: POST /activity/{location_id}/{event_id}/book
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `event_id` (integer, required)
    Event ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

## Request fields (*/*):

  - `fullname` (string, required)
    Client name
    Example: "James Smith"

  - `phone` (string, required)
    Customer phone (for example +13155550175)
    Example: "+13155550175"

  - `email` (string, required)
    Postal address of the client
    Example: "j.smith@example.com"

  - `code` (number)
    SMS confirmation code for verifying the phone number. This field is required if the location has phone_confirmation = true

  - `comment` (string)
    Appointment Comment

  - `notify_by_sms` (integer)
    Specifies how many hours in advance an SMS reminder should be sent before the appointment. Set to 0 to disable SMS reminders.

  - `notify_by_email` (integer)
    Specifies how many hours in advance an email reminder should be sent before the appointment. Set to 0 to disable email reminders

  - `type` (string)
    Appointment source
    Example: "mobile"

  - `api_id` (number)
    Appointment ID from external system

  - `clients_count` (number)
    number of seats

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":28417878,"hash":"9e6a54a1a9b118b65cc39ab6f3c3b5b4"}

  - `data.id` (integer)
    Appointment ID
    Example: 28417878

  - `data.hash` (string)
    Appointment ID, for deleting it immediately after creation
    Example: "9e6a54a1a9b118b65cc39ab6f3c3b5b4"

  - `meta` (array)
    Metadata (empty array)
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


