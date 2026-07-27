# Get Booking User for Attendance

Retrieve one Booking User profile used by the attendance workflow as a
JSON:API resource object.

The client_id path parameter and client resource type are literal
legacy wire names. Optional related data is returned only when requested
through include and may require additional Business User permissions or
enabled Location features.

Endpoint: GET /locations/{location_id}/attendance/clients/{client_id}
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

  - `client_id` (integer, required)
    Booking User profile ID; client_id is the literal wire name

## Query parameters:

  - `include` (array)
    Related resources to include; values are literal API keys
    Enum: "labels", "first_successful_visit", "loyalty_cards", "loyalty_certificates", "loyalty_abonements", "custom_field_values", "agreements"

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.type` (string, required)
    Literal legacy JSON:API resource type for a Booking User

  - `data.id` (string, required)
    Booking User profile ID

  - `data.attributes` (object, required)

  - `data.attributes.name` (string, required)
    Booking User first name

  - `data.attributes.surname` (string, required)
    Booking User surname, subject to Business User permissions

  - `data.attributes.patronymic` (string, required)
    Booking User patronymic, subject to Business User permissions

  - `data.attributes.phone` (string, required)
    Booking User phone number, subject to Business User permissions

  - `data.attributes.additional_phone` (string, required)
    Additional phone number, or an empty string

  - `data.attributes.email` (string, required)
    Email address, or an empty string

  - `data.attributes.comment` (string, required)
    Booking User card comment, subject to Business User permissions

  - `data.attributes.client_tips` (boolean, required)
    Whether the Booking User can leave tips

  - `data.attributes.birthday` (string,null, required)
    Birthday without a timezone, or null

  - `data.attributes.card_number` (string, required)
    Booking User card number, or an empty string

  - `data.attributes.gender` (integer, required)
    Literal gender wire value

  - `data.attributes.discount` (number, required)
    Deprecated discount percentage; use discount_percent

  - `data.attributes.discount_percent` (number, required)
    Booking User discount percentage

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.labels` (object)

  - `data.relationships.labels.data` (array, required)

  - `data.relationships.labels.data.type` (string, required)

  - `data.relationships.labels.data.id` (string, required)

  - `data.relationships.first_successful_visit` (object)

  - `data.relationships.first_successful_visit.data` (any, required)

  - `data.relationships.loyalty_cards` (object)

  - `data.relationships.loyalty_certificates` (object)

  - `data.relationships.loyalty_abonements` (object)

  - `data.relationships.custom_field_values` (object)

  - `data.relationships.agreements` (object)

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


