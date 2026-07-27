# Deprecated. Quick create a position (deprecated)

This endpoint is deprecated. Use POST /v2/companies/{company_id}/positions instead.

Creates a new position in a location; position is created as a chain entity and at the same time linked to a location initiated its creation.

Migration: The V2 Positions API provides full CRUD operations with enhanced validation and JSON:API format responses. See operation create_position for details.

Endpoint: POST /company/{location_id}/positions/quick
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

## Request fields (application/json):

  - `title` (string, required)
    Title of a position.
    Example: "Position"

## Response 201 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Data for an existing position in a chain.

  - `data.id` (number)
    ID of a position.

  - `data.chain_id` (number)
    ID of a chain, where position was created.

  - `data.title` (string)
    Title of a position.

  - `data.description` (string)
    Description of a position.

  - `data.services_binding_type` (number)
    Type of binding of services to a position:  
0: - binding disabled;  
2: - strict binding.
    Enum: 0, 2

  - `data.rules_required_fields` (array)
    Fields required to be filled for a team member to be able to be linked to a position.

  - `data.only_chain_appointment` (boolean)
    Availability of linking a team member to a position only in a chain.

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


