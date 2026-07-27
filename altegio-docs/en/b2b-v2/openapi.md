# Business Management

Next-generation B2B API with improved design and consistency.

**Base URL:** `https://api.alteg.io/api/v2`

## Status

This API is in active development. New features and improvements are released here first.
We recommend using this API for all new integrations.

## Authentication

Requires both partner and Business User authorization:
```
Authorization: Bearer <partner_token>, User <user_token>
```

## Required Media Type

Every request must include:
```
Accept: application/vnd.api.v2+json
```

Requests without the v2 media type return `400`. A charset parameter is accepted.

## URL Patterns

Location-scoped resources use `/locations/{location_id}/...`.

Positions and Tags preserve the literal `company_id` path parameter name for
SDK compatibility, but its value is the Location identifier. The legacy
`/companies/{company_id}/positions` and `/companies/{company_id}/tags` paths
remain accepted as compatibility aliases.


Version: 2.0.0
License: Altegio API Agreement

## Servers

Production
```
https://api.alteg.io/api/v2
```

## Security

### BearerPartnerUser

Type: http
Scheme: bearer
Bearer Format: Bearer {PartnerToken}, User {UserToken}

## Download OpenAPI description

[Business Management](https://developer.alteg.io/_bundle/en/b2b-v2/openapi.yaml)

## Services

Service catalog management.

Retrieve services and service categories for a location.


### List Services

 - [GET /locations/{location_id}/services](https://developer.alteg.io/en/b2b-v2/openapi/services/list_services.md): Retrieve Services for a Location, optionally filtered by Service IDs.

The response uses JSON:API resource objects. Pagination uses page and
limit; pagination metadata is not returned.

Related data can be requested by repeating the include parameter, for
example ?include=resources&include=company_links.

### Get Service

 - [GET /locations/{location_id}/services/{service_id}](https://developer.alteg.io/en/b2b-v2/openapi/services/get_service.md): Retrieve a Service for a Location as a JSON:API resource object.

Related data can be requested by repeating the include parameter, for
example ?include=resources&include=company_links.

### List Service Categories

 - [GET /locations/{location_id}/service_categories](https://developer.alteg.io/en/b2b-v2/openapi/services/list_service_categories.md): Retrieve Service Categories for a Location as JSON:API resource objects.

Use filter[staff_id] to return categories containing Services assigned to
a specific Team Member.

### List Attendance Services

 - [GET /locations/{location_id}/attendance_services](https://developer.alteg.io/en/b2b-v2/openapi/services/list_attendance_services.md): Retrieve Service delivery options for the Location timetable. Each result
combines a Service with its applicable Team Member, duration, price, and
composite Service context.

The response is paginated and includes pagination metadata.

### List Composite Service Attendance Services

 - [GET /locations/{location_id}/composite_services/{service_id}/attendance_services](https://developer.alteg.io/en/b2b-v2/openapi/services/list_composite_service_attendance_services.md): Retrieve the Service delivery options that make up a composite Service in
a Location, including Team Member, duration, price, and position data.

### List Attendance Service Suggestions

 - [GET /locations/{location_id}/attendance_service_suggestions](https://developer.alteg.io/en/b2b-v2/openapi/services/list_attendance_service_suggestions.md): Retrieve Service suggestions for a Team Member. Supplying a Booking User
ID adds suggestions based on that Booking User's prior Appointments and
popular Services.

Use include=attendance_service or include=record to include the
suggested Service delivery option or source Appointment. The literal
record include value is retained by the wire contract.

## Products

Product inventory management.

Retrieve Products, Product Categories, measurement Units, stock levels,
and Appointment Product Items.


### List Product Units

 - [GET /locations/{location_id}/units](https://developer.alteg.io/en/b2b-v2/openapi/products/list_product_units.md): Retrieve the measurement Units available to Products in a Location as
JSON:API resource objects. The collection contains shared system Units and
any Units configured specifically for the Location.

Use Unit IDs as sale_unit_id and consumable_unit_id in Product data.

### List Products

 - [GET /locations/{location_id}/products](https://developer.alteg.io/en/b2b-v2/openapi/products/list_products.md): Retrieve Products for a Location as JSON:API resource objects.

Pagination uses page and limit. The response includes the effective
page, calculated offset, and limit in meta.pagination.

Related data can be requested by repeating the include parameter. The
actual_cost value is returned only when requested and when the Business
User has permission to view it.

### Autocomplete Products

 - [GET /locations/{location_id}/products/autocomplete](https://developer.alteg.io/en/b2b-v2/openapi/products/autocomplete_products.md): Search Products by name, article number, or barcode.

The search term must contain at least two characters and cannot contain
emoji. Pagination uses page and limit and is returned in
meta.pagination.

### Get Product

 - [GET /locations/{location_id}/products/{product_id}](https://developer.alteg.io/en/b2b-v2/openapi/products/get_product.md): Retrieve a Product for a Location as a JSON:API resource object.

Related data can be requested by repeating the include parameter. The
actual_cost value is returned only when requested and when the Business
User has permission to view it.

### List Product Storage Amounts

 - [GET /locations/{location_id}/products/{product_id}/storage_amounts](https://developer.alteg.io/en/b2b-v2/openapi/products/list_product_storage_amounts.md): Retrieve Product amounts across the Location's Storages as JSON:API
resource objects. Amounts are returned in both Sale Units and Consumable
Units.

### List Product Categories

 - [GET /locations/{location_id}/product_categories](https://developer.alteg.io/en/b2b-v2/openapi/products/list_product_categories.md): Retrieve Product Categories for a Location as JSON:API resource objects.

Omit filter[parent_category_id] or set it to 0 to return root Product
Categories. Set it to a Product Category ID to return direct children.

### Get Product Category

 - [GET /locations/{location_id}/product_categories/{product_category_id}](https://developer.alteg.io/en/b2b-v2/openapi/products/get_product_category.md): Retrieve a Product Category for a Location as a JSON:API resource object.

### Get Appointment Product Item

 - [GET /locations/{location_id}/attendance_product_items/{attendance_product_item_id}](https://developer.alteg.io/en/b2b-v2/openapi/products/get_attendance_product_item.md): Retrieve a Product item associated with an Appointment as a JSON:API
resource object.

The positive response shape is verified against the current PHP transformer
but has not been live-verified because the test Location has no safe fixture.

## Team Members

Team Member and position management.

Manage Team Member positions and retrieve Team Member information.


### List Team Members

 - [GET /locations/{location_id}/team_members](https://developer.alteg.io/en/b2b-v2/openapi/team-members/list_team_members.md): Retrieve Team Members for a Location as JSON:API resource objects.

Use the filters to select Team Members by name, Position, account link,
schedule, payment, dismissal, deletion, or assistant availability. Status
filters use 0, 1, and 2, where 2 disables that filter.

Related data can be requested by repeating the include parameter. The
employee wire value returns an employment profile that can contain
sensitive employment and identity data. Request and store it only when it
is necessary for the integration.

### List Positions

 - [GET /locations/{company_id}/positions](https://developer.alteg.io/en/b2b-v2/openapi/team-members/list_positions.md): Retrieve all Positions available to Team Members at a Location.

The response is a JSON:API collection and does not contain pagination
metadata. The literal company_id wire path parameter identifies a
Location.

### Create Position

 - [POST /locations/{company_id}/positions](https://developer.alteg.io/en/b2b-v2/openapi/team-members/create_position.md): Create a Position for Team Members at the specified Location.

### Get Position

 - [GET /locations/{company_id}/positions/{position_id}](https://developer.alteg.io/en/b2b-v2/openapi/team-members/get_position.md): Retrieve a Position by ID as a JSON:API resource object.

### Update Position

 - [PUT /locations/{company_id}/positions/{position_id}](https://developer.alteg.io/en/b2b-v2/openapi/team-members/update_position.md): Update a Position. The request must contain title.

### Delete Position

 - [DELETE /locations/{company_id}/positions/{position_id}](https://developer.alteg.io/en/b2b-v2/openapi/team-members/delete_position.md): Delete a Position.

## Appointments

Appointment management.

List and manage appointments for a location.


### List Attendance Appointments

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

### List Appointments

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

### Delete Appointment

 - [DELETE /locations/{location_id}/appointments/{appointment_id}](https://developer.alteg.io/en/b2b-v2/openapi/appointments/delete_appointment.md): Delete an Appointment. The Business User must have permission to delete
Appointments for the Location and permission to delete this Appointment.

### Delete Timetable Appointment

 - [POST /locations/{location_id}/timetable/appointments/delete](https://developer.alteg.io/en/b2b-v2/openapi/appointments/delete_timetable_appointment.md): Delete one Appointment from the timetable by its recordId wire field.

If the deleted Appointment belongs to a linked visit, the response returns
the remaining related Appointments as a JSON:API collection. Deleting an
Appointment without related Appointments returns an empty data array.

### List Resource Occupations

 - [GET /locations/{location_id}/resource_occupations](https://developer.alteg.io/en/b2b-v2/openapi/appointments/list_resource_occupations.md): Retrieve resource occupations that intersect a required time interval in a
Location. Results can be narrowed to one or more Services.

Each JSON:API resource identifies the occupied resource instance, its time
interval, and the source Appointment or Event.

## Events

Group Event management.

### List Events

 - [GET /locations/{location_id}/events](https://developer.alteg.io/en/b2b-v2/openapi/events/list_events.md): Retrieve Events for a Location within a future date range. The response is
a JSON:API collection with the literal resource type activity.

filter[from] must not be earlier than the current time, and filter[to]
must be later than filter[from].

### Create Event

 - [POST /locations/{location_id}/events](https://developer.alteg.io/en/b2b-v2/openapi/events/create_event.md): Create a group Event for a Location.

### Get Event

 - [GET /locations/{location_id}/events/{event_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/get_event.md): Return one Event in JSON:API format. Event deletion is soft: a deleted Event
is excluded from list results, while direct retrieval remains available.

### Update Event

 - [PUT /locations/{location_id}/events/{event_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/update_event.md): Replace the mutable properties of an Event.

### Delete Event

 - [DELETE /locations/{location_id}/events/{event_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/delete_event.md): Soft-delete an Event. The Event is removed from list results, and no
response body is returned.

### Create Event Appointment

 - [POST /locations/{location_id}/events/{event_id}/appointments](https://developer.alteg.io/en/b2b-v2/openapi/events/create_event_appointment.md): Create an Appointment in an Event. The literal client wire object is
required for both an existing and a new Booking User.

### Update Event Appointment

 - [PUT /locations/{location_id}/events/{event_id}/appointments/{record_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/update_event_appointment.md): Update pricing, Product Items, Tags, color, comment, or capacity for an Event Appointment.

### Reschedule Event Appointment

 - [PATCH /locations/{location_id}/events/{event_id}/appointments/{record_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/reschedule_event_appointment.md): Move an Appointment from this Event to another Event in the same Location.

## Booking Users

Booking User attendance and financial statistics.


### Get Booking User for Attendance

 - [GET /locations/{location_id}/attendance/clients/{client_id}](https://developer.alteg.io/en/b2b-v2/openapi/booking-users/get_attendance_booking_user.md): Retrieve one Booking User profile used by the attendance workflow as a
JSON:API resource object.

The client_id path parameter and client resource type are literal
legacy wire names. Optional related data is returned only when requested
through include and may require additional Business User permissions or
enabled Location features.

### Get Booking User Location Attendance Statistics

 - [GET /locations/{location_id}/clients/{client_id}/attendances_statistic](https://developer.alteg.io/en/b2b-v2/openapi/booking-users/get_booking_user_location_attendance_statistics.md): Retrieve attendance counts, financial totals, last successful attendance,
and deposits for one Booking User in a Location. Statistics remain
available for a deleted Booking User profile.

The client_id path parameter and client_attendances_statistic resource
type are literal legacy wire names.

### Get Booking User Chain Attendance Statistics

 - [GET /locations/{location_id}/clients/{client_id}/chain_attendances_statistic/{chain_id}](https://developer.alteg.io/en/b2b-v2/openapi/booking-users/get_booking_user_chain_attendance_statistics.md): Retrieve attendance counts, financial totals, last successful attendance,
and deposits for one Booking User across a Chain. The Business User must
have Appointment form access configured for the requested Chain.

The client_id path parameter and
client_chain_attendances_statistic resource type are literal legacy wire
names.

## Custom Fields

Location-specific Custom Fields for Appointments and Booking Users.


### List Custom Fields

 - [GET /locations/{location_id}/custom_fields](https://developer.alteg.io/en/b2b-v2/openapi/custom-fields/list_custom_fields.md): Retrieve Custom Fields configured for Appointments and Booking Users in a
Location. Access depends on the Business User's Custom Field permissions.

The literal record and client filter values mean Appointment and
Booking User respectively. filter[entity_slug] is a compatibility alias
for filter[parent_entity_type].

## Tags

Booking User tagging system.

### List Tags

 - [GET /locations/{company_id}/tags](https://developer.alteg.io/en/b2b-v2/openapi/tags/list_tags.md): Returns all Tags for the specified Location, optionally filtered by entity type.

Response uses JSON:API format where type: "tag" is the resource type name (not to be confused with entity_type attribute).

Entity types:
- common (0) - General tags
- client (1) - Booking User Tags
- record (2) - Appointment Tags
- activity (3) - Event Tags

Use the entity query parameter to filter by type. Accepts both string aliases and numeric values.

### Create Tag

 - [POST /locations/{company_id}/tags](https://developer.alteg.io/en/b2b-v2/openapi/tags/create_tag.md): Creates a new Tag for the specified Location.

### Get Tag

 - [GET /locations/{company_id}/tags/{tag_id}](https://developer.alteg.io/en/b2b-v2/openapi/tags/get_tag.md): Returns detailed information about a specific Tag.

Response uses JSON:API format where type: "tag" is the resource type name.

### Update Tag

 - [PUT /locations/{company_id}/tags/{tag_id}](https://developer.alteg.io/en/b2b-v2/openapi/tags/update_tag.md): Updates an existing Tag.

### Delete Tag

 - [DELETE /locations/{company_id}/tags/{tag_id}](https://developer.alteg.io/en/b2b-v2/openapi/tags/delete_tag.md): Deletes a Tag by marking it as deleted.

