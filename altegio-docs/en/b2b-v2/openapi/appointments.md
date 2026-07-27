# Appointments

Appointment management.

List and manage appointments for a location.


## List Attendance Appointments

 - [GET /locations/{location_id}/attendances/{attendance_id}/appointments](https://developer.alteg.io/en/b2b-v2/openapi/appointments/list_attendance_appointments.md): Retrieve Appointments grouped under one attendance identifier as JSON:API
resource objects.

Use record_{appointment_id} to retrieve the group containing one
Appointment, or visit_{visit_id} to retrieve all Appointments linked to
one visit. The attendance_id path parameter and both prefixes are literal
wire values.

Related data can be requested by repeating the include parameter. Wire
values remain literal API keys: client identifies Booking User data,
staff identifies Team Member data, and goods identifies Products.
Custom Field Value includes require the corresponding Business User
permissions.

## List Appointments

 - [GET /locations/{location_id}/appointments](https://developer.alteg.io/en/b2b-v2/openapi/appointments/list_appointments.md): Retrieve Appointments for a Location as JSON:API resource objects.

Pagination uses page and limit. The response includes the effective
page, calculated offset, and limit in meta.pagination.

Date range values use YYYY-MM-DDTHH:MM:SS without a timezone. Provide
filter[date_intersect_from] and filter[date_intersect_to] together; the
end must be later than the start.

Related data can be requested by repeating the include parameter. Wire
values remain literal API keys: client identifies Booking User data,
staff identifies Team Member data, and goods identifies Products.
Custom Field Value includes require the corresponding Business User
permissions.

## Delete Appointment

 - [DELETE /locations/{location_id}/appointments/{appointment_id}](https://developer.alteg.io/en/b2b-v2/openapi/appointments/delete_appointment.md): Delete an Appointment. The Business User must have permission to delete
Appointments for the Location and permission to delete this Appointment.

## Delete Timetable Appointment

 - [POST /locations/{location_id}/timetable/appointments/delete](https://developer.alteg.io/en/b2b-v2/openapi/appointments/delete_timetable_appointment.md): Delete one Appointment from the timetable by its recordId wire field.

If the deleted Appointment belongs to a linked visit, the response returns
the remaining related Appointments as a JSON:API collection. Deleting an
Appointment without related Appointments returns an empty data array.

## List Resource Occupations

 - [GET /locations/{location_id}/resource_occupations](https://developer.alteg.io/en/b2b-v2/openapi/appointments/list_resource_occupations.md): Retrieve resource occupations that intersect a required time interval in a
Location. Results can be narrowed to one or more Services.

Each JSON:API resource identifies the occupied resource instance, its time
interval, and the source Appointment or Event.

