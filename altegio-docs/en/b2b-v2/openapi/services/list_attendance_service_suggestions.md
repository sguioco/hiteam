# List Attendance Service Suggestions

Retrieve Service suggestions for a Team Member. Supplying a Booking User
ID adds suggestions based on that Booking User's prior Appointments and
popular Services.

Use include=attendance_service or include=record to include the
suggested Service delivery option or source Appointment. The literal
record include value is retained by the wire contract.

Endpoint: GET /locations/{location_id}/attendance_service_suggestions
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

## Query parameters:

  - `staff_id` (integer, required)
    Team Member ID

  - `client_id` (integer)
    Booking User profile ID; client_id is the literal wire name

  - `include` (array)
    Related Attendance Service or source Appointment to include
    Enum: "attendance_service", "record"

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Suggested Service ID

  - `data.attributes` (object, required)

  - `data.attributes.service_id` (integer, required)
    Suggested Service ID

  - `data.attributes.suggestion_type` (string, required)
    Suggestion reason. Enum values are literal wire values; client
identifies a Booking User and master identifies a Team Member.
    Enum: "last_client_visit_attendance_service", "client_popular_service", "master_popular_service"

  - `data.attributes.record_id` (integer,null, required)
    Source Appointment ID when the suggestion is based on a prior visit

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.attendance_service` (object)

  - `data.relationships.attendance_service.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `data.relationships.record` (object)

  - `included` (array) — one of:
    Resources requested through include, when available
    - Attendance Service Resource:
      - `type` (string, required)
        Literal JSON:API resource type
      - `id` (string, required)
        Compound Attendance Service identifier
      - `attributes` (object, required)
      - `attributes.company_id` (integer, required)
        Location ID
      - `attributes.service_id` (integer, required)
        Service ID
      - `attributes.category_id` (integer, required)
        Service Category ID
      - `attributes.is_composite` (boolean, required)
        Whether the Service is composite
      - `attributes.composite_service_id` (integer, required)
        Parent composite Service ID, or 0
      - `attributes.salon_service_id` (integer,null, required)
        Location-specific Service link ID
      - `attributes.composite_position` (integer,null, required)
        Position within a composite Service
      - `attributes.staff_id` (integer, required)
        Team Member ID, or 0 when not Team Member-specific
      - `attributes.title` (string, required)
        Service name
      - `attributes.duration` (integer, required)
        Service duration in seconds
      - `attributes.price_min` (number, required)
        Minimum Service price
      - `attributes.price_max` (number, required)
        Maximum Service price
      - `attributes.technical_break_duration` (integer, required)
        Technical break duration in seconds
      - `attributes.length` (integer, required)
        Deprecated duration in seconds; use duration
    - includedResource:
      - `type` (string, required)
      - `id` (string, required)
      - `attributes` (object, required)
      - `relationships` (object)

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


