# List Composite Service Attendance Services

Retrieve the Service delivery options that make up a composite Service in
a Location, including Team Member, duration, price, and position data.

Endpoint: GET /locations/{location_id}/composite_services/{service_id}/attendance_services
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
    Composite Service ID

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Compound Attendance Service identifier

  - `data.attributes` (object, required)

  - `data.attributes.company_id` (integer, required)
    Location ID

  - `data.attributes.service_id` (integer, required)
    Service ID

  - `data.attributes.category_id` (integer, required)
    Service Category ID

  - `data.attributes.is_composite` (boolean, required)
    Whether the Service is composite

  - `data.attributes.composite_service_id` (integer, required)
    Parent composite Service ID, or 0

  - `data.attributes.salon_service_id` (integer,null, required)
    Location-specific Service link ID

  - `data.attributes.composite_position` (integer,null, required)
    Position within a composite Service

  - `data.attributes.staff_id` (integer, required)
    Team Member ID, or 0 when not Team Member-specific

  - `data.attributes.title` (string, required)
    Service name

  - `data.attributes.duration` (integer, required)
    Service duration in seconds

  - `data.attributes.price_min` (number, required)
    Minimum Service price

  - `data.attributes.price_max` (number, required)
    Maximum Service price

  - `data.attributes.technical_break_duration` (integer, required)
    Technical break duration in seconds

  - `data.attributes.length` (integer, required)
    Deprecated duration in seconds; use duration

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


