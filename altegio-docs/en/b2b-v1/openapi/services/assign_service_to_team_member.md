# Linking a Team Member to a Provided Service

Creates a team member service link with provided duration and bill of materials.

Endpoint: POST /company/{location_id}/services/{service_id}/staff
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

  - `service_id` (number, required)
    ID of service.
    Example: 123

## Request fields (application/json):

  - `master_id` (number, required)
    ID of a team member who provides the service.
    Example: 123

  - `seance_length` (number, required)
    Duration of service provision by the specified team member in seconds,
minimum 300 seconds (5 minutes), maximum 86100 seconds (23 hours 55 minutes).
    Example: 3600

  - `technological_card_id` (number,null, required)
    ID of bill of materials used while providing the service.
    Example: 123

## Response 201 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)

  - `data.service_id` (number)
    ID of service.

  - `data.master_id` (number)
    ID of team member.

  - `data.length` (number)
    Duration of service provision by the specified team member in seconds.

  - `data.technological_card_id` (number)
    ID of technological card.

  - `data.api_id` (string)
    External API identifier.

  - `data.is_online` (boolean)
    Whether the service is available for online booking.

  - `data.is_offline_records_allowed` (boolean)
    Whether offline appointments are allowed for this service-team member link.

  - `data.price` (any)
    Custom price for this team member providing the service.

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


