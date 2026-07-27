# Create Tag

Creates a new Tag for the specified Location.

Endpoint: POST /locations/{company_id}/tags
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `company_id` (integer, required)
    Location ID

## Request fields (application/json):

  - `title` (string, required)
    Tag name
    Example: "VIP Booking User"

  - `color` (string, required)
    Tag color in
    Example: "#ff2828"

  - `entity` (integer)
    Entity type (0 - general, 1 - Booking User, 2 - Appointment, 3 - Event)
    Enum: 0, 1, 2, 3

  - `icon` (string)
    Icon name
    Example: "star"

## Response 201 fields (application/json):

  - `data` (object)

  - `data.type` (string)
    Example: "tag"

  - `data.id` (string)
    Example: "241627"

  - `data.attributes` (object)
    Tag attributes (v2 API JSON:API format)

  - `data.attributes.company_id` (integer, required)
    Location ID
    Example: 68570

  - `data.attributes.title` (string, required)
    Tag name
    Example: "VIP Booking User"

  - `data.attributes.color` (string, required)
    Tag background color in
    Example: "#ff2828"

  - `data.attributes.entity_type` (string, required)
    Literal entity alias. client identifies Booking Users and record
identifies Appointments.
    Enum: "common", "client", "record", "activity"

  - `data.attributes.is_deleted` (boolean, required)
    Whether the Tag is deleted

  - `data.attributes.is_editable` (boolean, required)
    Whether the Tag can be updated or deleted
    Example: true

  - `data.attributes.font_color` (string)
    Tag font color in
    Example: "#ffffff"

  - `data.attributes.icon` (string)
    Icon name
    Example: "star"

  - `data.attributes.salon_id` (integer)
    Deprecated wire field for Location ID; use company_id
    Example: 68570

  - `data.attributes.entity` (integer)
    Deprecated numeric entity type: 0 general, 1 Booking User, 2 Appointment, 3 Event
    Example: 1

  - `data.attributes.entity_slug` (string)
    Deprecated literal entity alias; use entity_type
    Example: "client"

  - `data.attributes.deleted` (integer)
    Deprecated deletion wire value; use is_deleted

  - `data.attributes.not_editable` (integer)
    Deprecated editability wire value; use is_editable

  - `meta` (array)

## Response 400 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 404 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)
    Example: "Required parameter title was not passed. Enter a category name"


