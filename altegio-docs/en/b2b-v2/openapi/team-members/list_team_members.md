# List Team Members

Retrieve Team Members for a Location as JSON:API resource objects.

Use the filters to select Team Members by name, Position, account link,
schedule, payment, dismissal, deletion, or assistant availability. Status
filters use 0, 1, and 2, where 2 disables that filter.

Related data can be requested by repeating the include parameter. The
employee wire value returns an employment profile that can contain
sensitive employment and identity data. Request and store it only when it
is necessary for the integration.

Endpoint: GET /locations/{location_id}/team_members
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

  - `filter[name]` (string)
    Filter by a partial Team Member name match

  - `filter[position_id]` (integer)
    Filter by Position ID

  - `filter[position_title]` (string)
    Filter by a partial Position title match

  - `filter[fired]` (integer)
    Filter by dismissal status: 0 not dismissed, 1 dismissed, 2 all
    Enum: 0, 1, 2

  - `filter[deleted]` (integer)
    Filter by deletion status: 0 active, 1 deleted, 2 all
    Enum: same as `filter[fired]` (3 values)

  - `filter[user_linked]` (integer)
    Filter by Business User link: 0 not linked, 1 linked, 2 all
    Enum: same as `filter[fired]` (3 values)

  - `filter[is_paid]` (integer)
    Filter by payment status: 0 unpaid, 1 paid, 2 all
    Enum: same as `filter[fired]` (3 values)

  - `filter[has_schedule]` (integer)
    Filter by schedule: 0 without a schedule, 1 with a schedule, 2 all
    Enum: same as `filter[fired]` (3 values)

  - `filter[is_assistant]` (integer)
    Filter by assistant availability: 0 unavailable, 1 available, 2 all
    Enum: same as `filter[fired]` (3 values)

  - `include` (array)
    Related resources to include. Wire values are literal API keys:
- position - Position
- employee - employment profile
    Enum: "position", "employee"

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Team Member ID

  - `data.attributes` (object, required)

  - `data.attributes.name` (string, required)
    Team Member name

  - `data.attributes.tt_markup` (integer, required)
    Schedule grid interval value

  - `data.attributes.specialization` (string, required)
    Team Member specialization

  - `data.attributes.image` (string, required)
    Team Member image URL

  - `data.attributes.position_id` (integer, required)
    Position ID

  - `data.attributes.is_available_as_assistant` (boolean, required)
    Whether the Team Member is available as an assistant

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.position` (object)

  - `data.relationships.position.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `data.relationships.employee` (object)

  - `included` (array) — one of:
    Resources requested through include, when available
    - Position Resource:
      - `type` (string, required)
        Literal JSON:API resource type
      - `id` (string, required)
        Position ID
      - `attributes` (object, required)
      - `attributes.title` (string, required)
        Position title
    - Employment Profile Resource:
      - `type` (string, required)
        Literal JSON:API resource type
      - `id` (string, required)
        Employment profile ID
      - `attributes` (object, required)
      - `attributes.phone` (string, required)
        Phone number
      - `attributes.name` (string, required)
        Display name
      - `attributes.firstname` (string, required)
        First name
      - `attributes.surname` (string, required)
        Last name
      - `attributes.patronymic` (string, required)
        Patronymic
      - `attributes.date_admission` (string,null, required)
        Employment start date and time without a timezone
      - `attributes.date_registration_end` (string,null, required)
        Registration end date and time without a timezone
      - `attributes.citizenship` (string, required)
        Citizenship
      - `attributes.gender` (integer, required)
        Gender wire value: 0 unspecified, 1 male, 2 female
        Enum: same as `filter[fired]` (3 values)
      - `attributes.passport_data` (string, required)
        Passport data
      - `attributes.personal_tax_reference_number` (string, required)
        Personal tax reference number
      - `attributes.number_insurance_certificates` (string, required)
        Insurance certificate number

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


