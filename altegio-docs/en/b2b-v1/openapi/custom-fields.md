# Custom Fields

Custom field definitions for various entities

## Getting a collection of location fields

 - [GET /custom_fields/{field_category}/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/get_custom_field_list.md)

## Adding a Custom Field

 - [POST /custom_fields/{field_category}/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/create_custom_field.md): To add a field, the user must be part of the Chain associated with the location and have the appropriate access rights in the following section: Settings → Access → Custom Fields → Create custom fields

## Update a Custom Field

 - [PUT /custom_fields/{field_category}/{location_id}/{field_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/update_custom_field.md): To update a field, the user must be part of the Chain associated with the location and have the appropriate access rights in the following section Settings → Access → Custom Fields → Modify custom fields

## Remove a Custom Field from a Location

 - [DELETE /custom_fields/{field_category}/{location_id}/{field_id}](https://developer.alteg.io/en/b2b-v1/openapi/custom-fields/delete_custom_field.md): To remove a field, the user must be part of the Chain associated with the location and have the appropriate access rights in the following section: Settings → Access → Custom Fields → Remove custom fields

