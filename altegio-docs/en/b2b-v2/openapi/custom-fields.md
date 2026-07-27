# Custom Fields

Location-specific Custom Fields for Appointments and Booking Users.


## List Custom Fields

 - [GET /locations/{location_id}/custom_fields](https://developer.alteg.io/en/b2b-v2/openapi/custom-fields/list_custom_fields.md): Retrieve Custom Fields configured for Appointments and Booking Users in a
Location. Access depends on the Business User's Custom Field permissions.

The literal record and client filter values mean Appointment and
Booking User respectively. filter[entity_slug] is a compatibility alias
for filter[parent_entity_type].

