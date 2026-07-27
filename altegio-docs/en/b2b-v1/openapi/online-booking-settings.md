# Online Booking Settings

Configure online booking behavior and forms

## Get Online Booking Settings

 - [GET /company/{location_id}/settings/online](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_online_booking_settings.md)

## Update Online Booking Settings

 - [PATCH /company/{location_id}/settings/online](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/update_online_booking_settings.md)

## Get timeslot settings

 - [GET /company/{location_id}/settings/timeslots](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_timeslot_settings.md): Retrieves the timeslot configuration for online booking at a location.

Timeslot settings control how available booking times are displayed to clients:
- Grid type (predefined, schedule-based, or dynamic)
- Available time range
- Step interval between slots
- Delay before nearest available slot
- Per-weekday and per-date overrides

Timeslot values are in seconds from midnight (e.g., 7200 = 02:00, 50400 = 14:00).

## Get a list of booking widgets

 - [GET /company/{location_id}/booking_forms](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_booking_widget_list.md)

## Create a Booking Widget

 - [POST /company/{location_id}/booking_forms](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/create_booking_widget.md)

## Get a Booking Widget

 - [GET /company/{location_id}/booking_forms/{form_id}](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/get_booking_widget.md)

## Delete Booking Widget

 - [DELETE /company/{location_id}/booking_forms/{form_id}](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/delete_booking_widget.md)

## Change Booking Widget

 - [PATCH /company/{location_id}/booking_forms/{form_id}](https://developer.alteg.io/en/b2b-v1/openapi/online-booking-settings/update_booking_widget.md)

