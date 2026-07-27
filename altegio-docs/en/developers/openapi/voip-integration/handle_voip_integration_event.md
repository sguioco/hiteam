# VoIP events

#### Enable integration
To use the api and activate access to the settings in the user interface, you need to activate the integration by sending the "Enable integration" request. After a successful connection, access to the section with routing settings will be opened in the chain user interface.

#### Disable integration
To disable the integration, you can use the "Disable integration" method. After the integration is disabled, access to the user interface settings section is closed, the requests "Call notification" and "Call information saving" are not processed.

#### Call notification
To display notifications about an incoming call, the "Call notification" method is used, the call type ("incoming", "outgoing", "internal") is specified in the parameters, but currently notifications are displayed only for the "incoming" value. Notifications are displayed for users defined based on routing settings. When specifying the "user" and "diversion" parameters at the same time, "user" is the priority when searching for routes.

#### Saving call information
The information about the call is automatically saved to the chain history and to the history of chain locations in accordance with the call routing settings.

Endpoint: POST /voip/integration
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Request fields (application/json):

  - `body` (Connect Integration (object) or Disable integration (object) or Saving call information (object) or call notification (object), required) — one of:
    - Connect Integration:
      - `command` (string, required)
        Operation type: 'setup'
        Example: "setup"
      - `crm_token` (string, required)
        CRM-token from the VoIP Integration in the client's chain section
        Example: "7cf262d6-1656-43f9-86ac-2826bdc125d2"
      - `type` (string, required)
        Operation type, in this case 'enable'
        Example: "enable"
    - Disable integration:
      - `command` (string, required)
        Operation type: 'setup'
        Example: "setup"
      - `crm_token` (string, required)
        CRM-token from the VoIP Integration in the client's chain section
        Example: "7cf262d6-1656-43f9-86ac-2826bdc125d2"
      - `type` (string, required)
        Operation type, in this case 'disable'
        Example: "disable"
    - Saving call information:
      - `command` (string, required)
        Operation type: 'history'
        Example: "history"
      - `crm_token` (string, required)
        CRM-token from the VoIP Integration in the client's chain section
        Example: "7cf262d6-1656-43f9-86ac-2826bdc125d2"
      - `diversion` (string, required)
        The number through which the call came
        Example: "+13155550176"
      - `phone` (string, required)
        Caller number
        Example: "+13155550175"
      - `type` (string, required)
        Operation type ("incoming", "outgoing", "internal")
        Example: "incoming"
      - `user` (string)
        SIP subscriber ID
        Example: "external_user_id"
      - `duration` (number)
        Call duration (in seconds)
        Example: 90
      - `link` (string)
        Call recording link
        Example: "https://external.call.storage/call_record.mp3"
      - `call_id` (string)
        Call ID in voip system
        Example: "external_call_id"
      - `status` (string)
        Call status 'success'|'missed'
        Example: "success"
      - `date` (string)
        Date and time of the call (ISO8601)
        Example: "2026-09-01T14:40:28-05:00"
    - call notification:
      - `command` (string, required)
        Operation type: 'event'
        Example: "event"
      - `crm_token` (string, required)
        CRM-token from the VoIP Integration in the client's chain section
        Example: "7cf262d6-1656-43f9-86ac-2826bdc125d2"
      - `diversion` (string, required)
        The number through which the call came
        Example: "+13155550176"
      - `phone` (string, required)
        Caller number
        Example: "+13155550175"
      - `type` (string, required)
        Operation type, in this case "incoming"
        Example: "incoming"
      - `user` (string)
        SIP number
        Example: "external_user_id"

## Response 202 fields (application/json):

  - `success` (boolean)
    Success status (true)
    Example: true

  - `data` (string)
    Contains null

  - `meta` (object)
    Metadata (contain an "Accepted" message)
    Example: {"message":"Accepted"}

  - `meta.message` (string)
    Example: "Accepted"

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


