# Get team member schedules

Retrieves work schedules for team members as working intervals.

Optionally includes:
- Busy intervals (appointments and events)
- Off-day type identifiers

Query Parameters:
- start_date / end_date - Date range for schedule search
- staff_ids[] - Filter by specific team members
- include[] - Include additional data (busy_intervals, off_day_type)

Endpoint: GET /company/{location_id}/staff/schedule
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

## Query parameters:

  - `start_date` (string)
    Start date for schedule search (YYYY-MM-DD)
    Example: "2026-01-31"

  - `end_date` (string)
    End date for schedule search (YYYY-MM-DD)
    Example: "2026-03-31"

  - `staff_ids` (array)
    Team member IDs to filter by.
Example: staff_ids[]=123&staff_ids[]=234

  - `include` (array)
    Additional data to include in response.
Example: include[]=busy_intervals&include[]=off_day_type
    Enum: "busy_intervals", "off_day_type"

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (array)

  - `data.staff_id` (integer)
    Team member ID
    Example: 12345

  - `data.date` (string)
    Schedule date (YYYY-MM-DD)
    Example: "2026-01-31"

  - `data.slots` (array)
    Working time intervals

  - `data.slots.from` (string)
    Interval start time (HH:mm)
    Example: "10:00"

  - `data.slots.to` (string)
    Interval end time (HH:mm)
    Example: "19:00"

  - `data.busy_intervals` (array)
    Time intervals occupied by appointments or events.
Only included when include[]=busy_intervals.

  - `data.busy_intervals.entity_type` (string)
    Entity type occupying the interval
    Enum: "record", "activity"

  - `data.busy_intervals.entity_id` (integer)
    Entity ID (appointment or event ID)
    Example: 456789

  - `data.busy_intervals.from` (string)
    Interval start time (HH:mm:ss)
    Example: "11:00:00"

  - `data.busy_intervals.to` (string)
    Interval end time (HH:mm:ss)
    Example: "12:00:00"

  - `data.off_day_type` (any)
    Off-day type ID (if this is a non-working day).
Only included when include[]=off_day_type.
    Example: 3

  - `meta` (object)

  - `meta.count` (integer)
    Total number of schedule entries
    Example: 15

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


