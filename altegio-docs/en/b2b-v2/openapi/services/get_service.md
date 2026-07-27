# Get Service

Retrieve a Service for a Location as a JSON:API resource object.

Related data can be requested by repeating the include parameter, for
example ?include=resources&include=company_links.

Endpoint: GET /locations/{location_id}/services/{service_id}
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID

  - `service_id` (integer, required)
    Service ID

## Query parameters:

  - `include` (array)
    Related resources to include. The wire values are literal API keys:
company_links contains Location-specific Service links.
    Enum: "resources", "service_composite", "resource_links", "company_links", "trial_settings"

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Service ID

  - `data.attributes` (object, required)

  - `data.attributes.title` (string, required)
    Service name

  - `data.attributes.category_id` (integer, required)
    Service Category ID

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.resources` (object)

  - `data.relationships.resources.data` (array, required)

  - `data.relationships.resources.data.type` (string, required)

  - `data.relationships.resources.data.id` (string, required)

  - `data.relationships.service_composite` (object)

  - `data.relationships.service_composite.data` (any, required)

  - `data.relationships.resource_links` (object)

  - `data.relationships.company_links` (object)

  - `data.relationships.trial_settings` (object)

  - `meta` (array, required)

  - `included` (array)
    Resources requested through include, when available

  - `included.type` (string, required)

  - `included.id` (string, required)

  - `included.attributes` (object, required)

  - `included.relationships` (object)

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


