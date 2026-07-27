# Services

Service catalog management.

Retrieve services and service categories for a location.


## List Services

 - [GET /locations/{location_id}/services](https://developer.alteg.io/en/b2b-v2/openapi/services/list_services.md): Retrieve Services for a Location, optionally filtered by Service IDs.

The response uses JSON:API resource objects. Pagination uses page and
limit; pagination metadata is not returned.

Related data can be requested by repeating the include parameter, for
example ?include=resources&include=company_links.

## Get Service

 - [GET /locations/{location_id}/services/{service_id}](https://developer.alteg.io/en/b2b-v2/openapi/services/get_service.md): Retrieve a Service for a Location as a JSON:API resource object.

Related data can be requested by repeating the include parameter, for
example ?include=resources&include=company_links.

## List Service Categories

 - [GET /locations/{location_id}/service_categories](https://developer.alteg.io/en/b2b-v2/openapi/services/list_service_categories.md): Retrieve Service Categories for a Location as JSON:API resource objects.

Use filter[staff_id] to return categories containing Services assigned to
a specific Team Member.

## List Attendance Services

 - [GET /locations/{location_id}/attendance_services](https://developer.alteg.io/en/b2b-v2/openapi/services/list_attendance_services.md): Retrieve Service delivery options for the Location timetable. Each result
combines a Service with its applicable Team Member, duration, price, and
composite Service context.

The response is paginated and includes pagination metadata.

## List Composite Service Attendance Services

 - [GET /locations/{location_id}/composite_services/{service_id}/attendance_services](https://developer.alteg.io/en/b2b-v2/openapi/services/list_composite_service_attendance_services.md): Retrieve the Service delivery options that make up a composite Service in
a Location, including Team Member, duration, price, and position data.

## List Attendance Service Suggestions

 - [GET /locations/{location_id}/attendance_service_suggestions](https://developer.alteg.io/en/b2b-v2/openapi/services/list_attendance_service_suggestions.md): Retrieve Service suggestions for a Team Member. Supplying a Booking User
ID adds suggestions based on that Booking User's prior Appointments and
popular Services.

Use include=attendance_service or include=record to include the
suggested Service delivery option or source Appointment. The literal
record include value is retained by the wire contract.

