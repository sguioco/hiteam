# Get Location's Call List

This endpoint is designed to get a list of calls in a location, taking into account filters and pagination

Endpoint: GET /voip/integration/calls
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Request fields (application/json):

  - `salon_id` (number, required)
    Location ID.
    Example: 615243

  - `date_from` (string, required)
    Start date.
    Example: "2026-01-01"

  - `date_to` (string, required)
    End date.
    Example: "2026-02-01"

  - `phone` (string)
    Phone number.
    Example: "+13155550175"

  - `types` (array)
    Call types list
    Enum: "incoming", "outgoing", "internal"

  - `statuses` (array)
    Call statuses list
    Enum: "success", "missed", "cancel", "busy", "notallowed", "notavailable", "notfound"

  - `page` (number)
    Page number
    Example: 1

  - `limit` (number)
    Amount of elements on page
    Example: 25

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.
    Example: true

  - `data` (array)
    Calls list
    Example: [{"id":8923525,"client_id":51342134,"caller_phone":"+13155550175","record_link":"https://records.example.com/somelink.mp3","duration":244,"status":"success","type":"outgoing","call_date":"2026-01-17T23:52:21-05:00"},{"id":66795308,"client_id":0,"caller_phone":"+13155550175","record_link":"","duration":0,"status":"missed","type":"incoming","call_date":"2026-01-17T12:31:12-05:00"}]

  - `data.id` (integer)
    Call ID

  - `data.client_id` (integer)
    Client ID (if there is a client in Clients Base)

  - `data.caller_phone` (string)
    Phone number

  - `data.record_link` (string)
    Link to call recording (if available)

  - `data.duration` (integer)
    Call duration in seconds

  - `data.status` (string)
    Call status
    Enum: same as `statuses` (7 values)

  - `data.type` (string)
    Call type
    Enum: same as `types` (3 values)

  - `data.call_date` (string)
    Date and time of call

  - `meta` (object,array)
    Additional response data (empty object or empty array)

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


