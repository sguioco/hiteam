# Get Position

Retrieve a Position by ID as a JSON:API resource object.

Endpoint: GET /locations/{company_id}/positions/{position_id}
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `company_id` (integer, required)
    Location ID

  - `position_id` (integer, required)
    Position ID

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Position ID

  - `data.attributes` (object, required)

  - `data.attributes.chain_id` (integer, required)
    Chain ID

  - `data.attributes.title` (string, required)
    Position title

  - `data.attributes.description` (string, required)
    Position description

  - `data.attributes.services_binding_type` (integer, required)
    Service binding mode:
- 0 - disabled
- 1 - soft
- 2 - strict
    Enum: 0, 1, 2

  - `data.attributes.rules_required_fields` (array, required)
    Required rule fields

  - `data.attributes.only_chain_appointment` (boolean, required)
    Whether the Position is available only for Chain Appointments

  - `data.attributes.salon_ids` (array, required)
    Location IDs linked to the Position

  - `meta` (array, required)

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


