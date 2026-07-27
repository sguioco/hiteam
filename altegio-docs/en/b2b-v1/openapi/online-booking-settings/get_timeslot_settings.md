# Get timeslot settings

Retrieves the timeslot configuration for online booking at a location.

Timeslot settings control how available booking times are displayed to clients:
- Grid type (predefined, schedule-based, or dynamic)
- Available time range
- Step interval between slots
- Delay before nearest available slot
- Per-weekday and per-date overrides

Timeslot values are in seconds from midnight (e.g., 7200 = 02:00, 50400 = 14:00).

Endpoint: GET /company/{location_id}/settings/timeslots
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

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (object)
    Timeslot settings object

  - `data.is_enabled` (boolean)
    Whether custom timeslots are enabled
    Example: true

  - `data.weekdays_settings` (array)
    Settings for each day of the week

  - `data.weekdays_settings.weekday` (integer)
    Day of week (1 = Monday, 7 = Sunday)
    Example: 1

  - `data.weekdays_settings.timeslots` (array)
    Available timeslots in seconds from midnight.
Only used when grid_base_type = "predefined".
    Example: [7200,14400,21600]

  - `data.weekdays_settings.setting` (object)
    Grid generation rules

  - `data.weekdays_settings.setting.grid_first_timeslot` (integer)
    Earliest available slot time in seconds from midnight

  - `data.weekdays_settings.setting.grid_last_timeslot` (integer)
    Latest available slot time in seconds from midnight
    Example: 85800

  - `data.weekdays_settings.setting.grid_display_step` (integer)
    Interval between displayed slots in seconds
    Example: 7200

  - `data.weekdays_settings.setting.grid_nearest_timeslot_delay` (integer)
    Minimum delay before nearest available slot in seconds
    Example: 1800

  - `data.weekdays_settings.setting.grid_base_type` (string)
    Grid type: predefined, schedule, or timeslots
    Enum: "predefined", "schedule", "timeslots"

  - `data.weekdays_settings.setting.is_grid_flexible` (boolean)
    Whether to add a flexible slot option

  - `data.dates_settings` (array)
    Per-date overrides (e.g., holidays, special days)

  - `data.dates_settings.date` (string)
    Date for override (YYYY-MM-DD)
    Example: "2026-12-25"

  - `data.dates_settings.timeslots` (array)
    Available timeslots for this date (empty = unavailable)
    Example: []

  - `data.dates_settings.setting` (object)
    Grid generation rules

  - `data.dates_settings.setting.grid_first_timeslot` (integer)

  - `data.dates_settings.setting.grid_last_timeslot` (integer)
    Example: 85800

  - `data.dates_settings.setting.grid_display_step` (integer)
    Example: 7200

  - `data.dates_settings.setting.grid_nearest_timeslot_delay` (integer)
    Example: 1800

  - `data.dates_settings.setting.grid_base_type` (string)
    Enum: same as `data.weekdays_settings.setting.grid_base_type` (3 values)

  - `data.dates_settings.setting.is_grid_flexible` (boolean)

  - `meta` (array)
    Example: []

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


