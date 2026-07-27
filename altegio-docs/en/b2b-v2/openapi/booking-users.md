# Booking Users

Booking User attendance and financial statistics.


## Get Booking User for Attendance

 - [GET /locations/{location_id}/attendance/clients/{client_id}](https://developer.alteg.io/en/b2b-v2/openapi/booking-users/get_attendance_booking_user.md): Retrieve one Booking User profile used by the attendance workflow as a
JSON:API resource object.

The client_id path parameter and client resource type are literal
legacy wire names. Optional related data is returned only when requested
through include and may require additional Business User permissions or
enabled Location features.

## Get Booking User Location Attendance Statistics

 - [GET /locations/{location_id}/clients/{client_id}/attendances_statistic](https://developer.alteg.io/en/b2b-v2/openapi/booking-users/get_booking_user_location_attendance_statistics.md): Retrieve attendance counts, financial totals, last successful attendance,
and deposits for one Booking User in a Location. Statistics remain
available for a deleted Booking User profile.

The client_id path parameter and client_attendances_statistic resource
type are literal legacy wire names.

## Get Booking User Chain Attendance Statistics

 - [GET /locations/{location_id}/clients/{client_id}/chain_attendances_statistic/{chain_id}](https://developer.alteg.io/en/b2b-v2/openapi/booking-users/get_booking_user_chain_attendance_statistics.md): Retrieve attendance counts, financial totals, last successful attendance,
and deposits for one Booking User across a Chain. The Business User must
have Appointment form access configured for the requested Chain.

The client_id path parameter and
client_chain_attendances_statistic resource type are literal legacy wire
names.

