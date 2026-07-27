# Update team member schedule (deprecated) (deprecated)

DEPRECATED: Use PUT /location/{location_id}/staff/schedule instead.

Updates the work schedule for a specific team member.

Endpoint: PUT /schedule/{location_id}/{team_member_id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID
    Example: 720441

  - `team_member_id` (integer, required)
    Team member ID
    Example: 12345

## Request fields (application/json):

  - `date` (string, required)
    Schedule date (YYYY-MM-DD)
    Example: "2026-01-15"

  - `is_working` (boolean, required)
    Whether the team member is working on this date
    Example: true

  - `slots` (array, required)
    Working time intervals

  - `slots.from` (string)
    Interval start time (HH:mm)
    Example: "10:00"

  - `slots.to` (string)
    Interval end time (HH:mm)
    Example: "14:30"

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


## Response 201 fields
