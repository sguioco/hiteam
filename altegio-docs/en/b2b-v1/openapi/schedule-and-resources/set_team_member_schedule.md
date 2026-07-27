# Set team member schedules

Sets work schedules for team members by date.

Supports both setting new schedules and deleting existing ones in a single request.

Returns the resulting schedules for affected team members within the date range
from minimum to maximum modified date.

Endpoint: PUT /company/{location_id}/staff/schedule
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

## Request fields (application/json):

  - `schedules_to_set` (array)
    Schedules to create or update

  - `schedules_to_set.team_member_id` (integer)
    Team member ID
    Example: 12345

  - `schedules_to_set.dates` (array)
    Dates to set schedule for (YYYY-MM-DD)
    Example: ["2026-01-31","2026-02-01"]

  - `schedules_to_set.slots` (array)
    Working time intervals

  - `schedules_to_set.slots.from` (string)
    Interval start time (HH:mm)
    Example: "10:00"

  - `schedules_to_set.slots.to` (string)
    Interval end time (HH:mm)
    Example: "19:00"

  - `schedules_to_delete` (array)
    Schedules to delete (make non-working days)

  - `schedules_to_delete.team_member_id` (integer)
    Team member ID
    Example: 12345

  - `schedules_to_delete.dates` (array)
    Dates to delete schedule for (YYYY-MM-DD)
    Example: ["2026-02-02","2026-02-03"]

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (array)
    Resulting schedules for modified team members

  - `data.team_member_id` (integer)
    Example: 12345

  - `data.date` (string)
    Example: "2026-01-31"

  - `data.slots` (array)

  - `data.slots.from` (string)
    Example: "10:00"

  - `data.slots.to` (string)
    Example: "19:00"

  - `meta` (object)

  - `meta.count` (integer)
    Example: 2

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

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)

  - `meta.errors` (object)


