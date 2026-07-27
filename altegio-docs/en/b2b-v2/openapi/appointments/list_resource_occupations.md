# List Resource Occupations

Retrieve resource occupations that intersect a required time interval in a
Location. Results can be narrowed to one or more Services.

Each JSON:API resource identifies the occupied resource instance, its time
interval, and the source Appointment or Event.

Endpoint: GET /locations/{location_id}/resource_occupations
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

  - `filter[date_intersect_from_strict]` (string, required)
    Interval start in the Location timezone, without an offset

  - `filter[date_intersect_to_strict]` (string, required)
    Interval end in the Location timezone, without an offset

  - `filter[service_id]` (integer)
    Filter by one Service ID

  - `filter[service_ids][]` (array)
    Filter by multiple Service IDs

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Resource occupation ID

  - `data.attributes` (object, required)

  - `data.attributes.source_type_slug` (string, required)
    Occupation source. Literal record and activity wire values mean
Appointment and Event respectively.
    Enum: "record", "activity"

  - `data.attributes.source_id` (integer, required)
    Appointment or Event ID, depending on source_type_slug

  - `data.attributes.resource_id` (integer, required)
    Resource ID

  - `data.attributes.resource_instance_id` (integer, required)
    Resource instance ID

  - `data.attributes.from` (string, required)
    Occupation start in the Location timezone

  - `data.attributes.to` (string, required)
    Occupation end in the Location timezone

  - `data.attributes.source_type` (string, required)
    Deprecated source type; use source_type_slug
    Enum: same as `data.attributes.source_type_slug` (2 values)

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


