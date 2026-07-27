# Schedule & Resources

Timetables, schedules, and resource allocation

## Get schedule of a specific team member

 - [GET /schedule/{location_id}/{team_member_id}/{start_date}/{end_date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_team_member_schedule.md)

## Change schedule of a specific team member

 - [PUT /schedule/{location_id}/{team_member_id}/{start_date}/{end_date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_team_member_schedule.md)

## Get a list of dates for Appointment Calendar

 - [GET /timetable/dates/{location_id}/{date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_appointment_calendar_dates.md): The Appointment Calendar dates are returned as an array of date strings, for example: [\"2026-10-26\", \"2026-10-30\"]. To retrieve this list, you must provide a reference date. The response will return the available working dates of the specified location or team member relative to that date

## Get a list of sessions for the Appointment Calendar

 - [GET /timetable/seances/{location_id}/{team_member_id}/{date}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_appointment_calendar_sessions.md): The sessions object for the log has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| time | string | Session time (17:30 for example) |
| free | boolean | Free time or busy |

## Getting Resources at a Location

 - [GET /resources/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_resource_list.md)

## Search a Schedule by Event

 - [GET /company/{location_id}/schedules/search/{entity_type}/{entity_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/search_timetable_event_schedules_by_event.md): Search for a schedule based on the appointment or event linked to it, or based on the associated appointment or event.

## Create a Schedule

 - [POST /company/{location_id}/schedules](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/create_timetable_event_schedule.md): Creates a schedule for appointments or events based on the original associated entity.

## Update a Schedule

 - [PATCH /company/{location_id}/schedules/{schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_timetable_event_schedule.md): Updates the settings of a schedule containing appointments or events.

## Delete a Schedule

 - [DELETE /company/{location_id}/schedules/{schedule_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/delete_timetable_event_schedule.md): Completely deletes a schedule along with all its series and the linked appointments or events.

## Create a Schedule Series

 - [POST /company/{location_id}/schedules/{schedule_id}/days](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/create_timetable_schedule_day.md): Adds a new series to an existing schedule of appointments or events.

## Update a schedule series

 - [PATCH /company/{location_id}/schedules/{schedule_id}/days/{day_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_timetable_schedule_day.md): Updates the settings of a schedule series for appointments or events.

## Delete a schedule series

 - [DELETE /company/{location_id}/schedules/{schedule_id}/days/{day_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/delete_timetable_schedule_day.md): Deletes a schedule series and all appointments or events linked to it.

## Get a List of Scheduled Appointments and Events

 - [GET /company/{location_id}/schedules/{schedule_id}/days/{day_id}/events](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/list_timetable_schedule_day_events.md): Prints  a list of events of scheduled records/activities.

## Retrieving Appointment Calendar Settings

 - [GET /company/{location_id}/settings/timetable](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_appointment_calendar_settings.md)

## Update Appointment Calendar settings

 - [PATCH /company/{location_id}/settings/timetable](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/update_appointment_calendar_settings.md)

## Get team member schedules

 - [GET /company/{location_id}/staff/schedule](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/get_team_member_schedule_list.md): Retrieves work schedules for team members as working intervals.

Optionally includes:
- Busy intervals (appointments and events)
- Off-day type identifiers

Query Parameters:
- start_date / end_date - Date range for schedule search
- staff_ids[] - Filter by specific team members
- include[] - Include additional data (busy_intervals, off_day_type)

## Set team member schedules

 - [PUT /company/{location_id}/staff/schedule](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/set_team_member_schedule.md): Sets work schedules for team members by date.

Supports both setting new schedules and deleting existing ones in a single request.

Returns the resulting schedules for affected team members within the date range
from minimum to maximum modified date.

## Update team member schedule (deprecated) (deprecated)

 - [PUT /schedule/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/schedule-and-resources/schedule_team_member_update_deprecated.md): DEPRECATED: Use PUT /location/{location_id}/staff/schedule instead.

Updates the work schedule for a specific team member.

