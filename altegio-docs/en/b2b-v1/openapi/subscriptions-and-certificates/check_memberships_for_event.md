# Check membership availability for event

Validates a specific subscription for creating activity schedules.

Returns:
- Last possible appointment date based on membership expiration
- Available visit count for the selected subscription
- Schedule day IDs that can be booked

Use cases:
- Validate subscription before creating recurring appointments
- Check if subscription has enough visits for schedule
- Determine last bookable date based on expiration
- Pre-validate schedule parameters

Note: Requires schedule_day_ids parameter to check specific dates.

Endpoint: GET /api/v1/company/{location_id}/client/{client_id}/loyalty/abonements/{membership_id}/check_for_activity
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID
    Example: 720441

  - `client_id` (integer, required)
    Client ID
    Example: 146915197

  - `membership_id` (integer, required)
    Membership instance ID
    Example: 5248829

## Query parameters:

  - `event_id` (integer, required)
    Event (group event) ID
    Example: 12345

  - `schedule_day_ids` (string, required)
    Comma-separated list of schedule day IDs to check
    Example: "1,2,3,4,5"

## Response 200 fields (application/json):

  - `data` (object)

  - `data.id` (string)
    Check result ID
    Example: "check_1"

  - `data.type` (string)
    Example: "loyalty_abonement_check"

  - `data.attributes` (object)

  - `data.attributes.last_booking_date` (string)
    Last possible appointment date (based on membership expiration)
    Example: "2026-03-31T23:59:59+00:00"

  - `data.attributes.available_visits` (integer)
    Number of visits available in membership
    Example: 10

  - `data.attributes.can_book_all_days` (boolean)
    Whether membership can cover all requested schedule days
    Example: true

  - `data.attributes.bookable_day_ids` (array)
    Schedule day IDs that can be booked
    Example: [1,2,3,4,5]

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Invalid schedule_day_ids"

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 404 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Event not found"


