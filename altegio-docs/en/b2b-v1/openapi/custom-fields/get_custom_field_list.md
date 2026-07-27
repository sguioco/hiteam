# Getting a collection of location fields

Endpoint: GET /custom_fields/{field_category}/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `field_category` (string, required)
    Field category.

- For appointments - appointment

- For clients - client
    Example: "record"

  - `location_id` (integer, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":1,"salon_id":1,"custom_field":{"id":1,"code":"my_text_field","show_in_ui":true,"title":"test field","user_can_edit":true,"type":{"code":"text","title":"Text"}}}]

  - `data.id` (integer)
    Field ID

  - `data.salon_id` (number)
    location ID

  - `data.custom_field` (object)
    Custom fields

  - `data.custom_field.id` (integer)
    Field ID

  - `data.custom_field.code` (string)
    Field code by which values for appointment fields are set

  - `data.custom_field.entity_type` (string)
    Entity type for which the field is valid (customer card, appointment window)

  - `data.custom_field.show_in_ui` (boolean)
    Whether to show fields in the interface

  - `data.custom_field.title` (string)
    Name of add. fields

  - `data.custom_field.user_can_edit` (boolean)
    Is editing allowed

  - `data.custom_field.type` (object)
    Field type

  - `data.custom_field.type.code` (string)
    Field type code

  - `data.custom_field.type.title` (string)
    Field type name

  - `data.custom_field.values` (string)
    List of valid values for type "list"

  - `meta` (array)
    Metadata (empty array)
    Example: []

## Response 401 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Authentication needed."

## Response 403 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Access denied."

## Response 404 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object,array)
    Additional response data (empty object or empty array)


