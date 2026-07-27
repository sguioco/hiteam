# List Custom Fields

Retrieve Custom Fields configured for Appointments and Booking Users in a
Location. Access depends on the Business User's Custom Field permissions.

The literal record and client filter values mean Appointment and
Booking User respectively. filter[entity_slug] is a compatibility alias
for filter[parent_entity_type].

Endpoint: GET /locations/{location_id}/custom_fields
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID

## Query parameters:

  - `filter[parent_entity_type]` (string)
    Filter by Appointment or Booking User wire entity value
    Enum: "record", "client"

  - `include` (array)
    Include Custom Field type or interface options
    Enum: "custom_field_type", "ui_options"

  - `filter[entity_slug]` (string)
    Compatibility alias for filter[parent_entity_type]
    Enum: same as `filter[parent_entity_type]` (2 values)

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Location Custom Field ID

  - `data.attributes` (object, required)

  - `data.attributes.slug` (string, required)
    Custom Field key used in API payloads

  - `data.attributes.entity_slug` (string, required)
    Entity wire value. record means Appointment and client means
Booking User.
    Enum: same as `filter[parent_entity_type]` (2 values)

  - `data.attributes.relation_entity_type` (null, required)
    Reserved wire field; currently always null

  - `data.attributes.is_visible` (boolean, required)
    Whether the Custom Field is visible in Altegio interfaces

  - `data.attributes.title` (string, required)
    Custom Field name

  - `data.attributes.is_editable` (boolean, required)
    Whether Business Users can edit the Custom Field value

  - `data.attributes.is_required` (boolean, required)
    Whether a value is required

  - `data.attributes.weight` (integer, required)
    Display order

  - `data.attributes.values` (array, required)
    Configured values for list-like Custom Fields

  - `data.attributes.code` (string, required)
    Deprecated Custom Field key; use slug

  - `data.attributes.parent_entity_type` (string, required)
    Deprecated entity wire value; use entity_slug
    Enum: same as `filter[parent_entity_type]` (2 values)

  - `data.attributes.show_in_ui` (boolean, required)
    Deprecated visibility flag; use is_visible

  - `data.attributes.user_can_edit` (boolean, required)
    Deprecated editability flag; use is_editable

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.custom_field_type` (object)

  - `data.relationships.custom_field_type.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `data.relationships.type` (object)

  - `data.relationships.ui_options` (object)

  - `data.relationships.ui_options.data` (array, required)

  - `data.relationships.ui_options.data.type` (string, required)

  - `data.relationships.ui_options.data.id` (string, required)

  - `included` (array) — one of:
    Resources requested through include, when available
    - Custom Field Type Resource:
      - `type` (string, required)
      - `id` (string, required)
        Custom Field Type ID
      - `attributes` (object, required)
      - `attributes.slug` (string, required)
        Custom Field Type key
      - `attributes.title` (string, required)
        Custom Field Type name
      - `attributes.code` (string, required)
        Deprecated type key; use slug
    - Custom Field UI Option Resource:
      - `type` (string, required)
      - `id` (string, required)
        Custom Field UI Option ID
      - `attributes` (object, required)
      - `attributes.slug` (string, required)
        UI Option key
      - `attributes.value` (boolean, required)
        Whether the UI Option is enabled

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


