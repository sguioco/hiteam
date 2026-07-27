# Events

Group Event management.

## List Events

 - [GET /locations/{location_id}/events](https://developer.alteg.io/en/b2b-v2/openapi/events/list_events.md): Retrieve Events for a Location within a future date range. The response is
a JSON:API collection with the literal resource type activity.

filter[from] must not be earlier than the current time, and filter[to]
must be later than filter[from].

## Create Event

 - [POST /locations/{location_id}/events](https://developer.alteg.io/en/b2b-v2/openapi/events/create_event.md): Create a group Event for a Location.

## Get Event

 - [GET /locations/{location_id}/events/{event_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/get_event.md): Return one Event in JSON:API format. Event deletion is soft: a deleted Event
is excluded from list results, while direct retrieval remains available.

## Update Event

 - [PUT /locations/{location_id}/events/{event_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/update_event.md): Replace the mutable properties of an Event.

## Delete Event

 - [DELETE /locations/{location_id}/events/{event_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/delete_event.md): Soft-delete an Event. The Event is removed from list results, and no
response body is returned.

## Create Event Appointment

 - [POST /locations/{location_id}/events/{event_id}/appointments](https://developer.alteg.io/en/b2b-v2/openapi/events/create_event_appointment.md): Create an Appointment in an Event. The literal client wire object is
required for both an existing and a new Booking User.

## Update Event Appointment

 - [PUT /locations/{location_id}/events/{event_id}/appointments/{record_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/update_event_appointment.md): Update pricing, Product Items, Tags, color, comment, or capacity for an Event Appointment.

## Reschedule Event Appointment

 - [PATCH /locations/{location_id}/events/{event_id}/appointments/{record_id}](https://developer.alteg.io/en/b2b-v2/openapi/events/reschedule_event_appointment.md): Move an Appointment from this Event to another Event in the same Location.

