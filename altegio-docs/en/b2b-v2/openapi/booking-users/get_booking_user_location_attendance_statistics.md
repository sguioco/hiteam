# Get Booking User Location Attendance Statistics

Retrieve attendance counts, financial totals, last successful attendance,
and deposits for one Booking User in a Location. Statistics remain
available for a deleted Booking User profile.

The client_id path parameter and client_attendances_statistic resource
type are literal legacy wire names.

Endpoint: GET /locations/{location_id}/clients/{client_id}/attendances_statistic
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

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.type` (string, required)
    Literal legacy JSON:API resource type for Location statistics

  - `data.id` (string, required)
    Compound Booking User and Location identifier

  - `data.attributes` (object, required)

  - `data.attributes.successful_attendances_count` (integer, required)
    Number of successful attendances

  - `data.attributes.failed_attendances_count` (integer, required)
    Number of failed attendances

  - `data.attributes.balance_amount` (number, required)
    Current balance

  - `data.attributes.spent_amount` (number, required)
    Total spent amount

  - `data.attributes.paid_amount` (number, required)
    Total paid amount

  - `data.attributes.last_successful_attendance_datetime` (string,null, required)
    Last successful attendance in the Location timezone

  - `data.attributes.company_id` (integer, required)
    Location ID; present only in Location statistics

  - `data.relationships` (object, required)

  - `data.relationships.deposits` (object, required)

  - `data.relationships.deposits.data` (array, required)

  - `data.relationships.deposits.data.type` (string, required)

  - `data.relationships.deposits.data.id` (string, required)

  - `meta` (array, required)

  - `included` (array)

  - `included.type` (string, required)

  - `included.id` (string, required)
    Deposit ID

  - `included.attributes` (object, required)

  - `included.attributes.title` (string, required)
    Deposit name

  - `included.attributes.balance` (number, required)
    Total balance

  - `included.attributes.reserved_balance` (number, required)
    Reserved balance

  - `included.attributes.available_balance` (number, required)
    Available balance after reservations

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


