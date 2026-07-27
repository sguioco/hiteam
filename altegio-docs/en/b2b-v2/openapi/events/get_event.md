# Get Event

Return one Event in JSON:API format. Event deletion is soft: a deleted Event
is excluded from list results, while direct retrieval remains available.

Endpoint: GET /locations/{location_id}/events/{event_id}
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

  - `event_id` (integer, required)
    Event ID

## Query parameters:

  - `include` (array)
    Related resources to include; values are literal API keys
    Enum: "staff", "service", "resource_instances", "labels", "duration_details", "master"

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.type` (string, required)
    Literal JSON:API resource type returned for Events

  - `data.id` (string, required)
    Event ID

  - `data.attributes` (object, required)

  - `data.attributes.master_id` (integer, required)
    Deprecated wire field for Team Member ID; use staff_id

  - `data.attributes.staff_id` (integer, required)
    Team Member ID

  - `data.attributes.service_id` (integer, required)
    Service ID

  - `data.attributes.timestamp` (integer, required)
    Event start as a Unix timestamp

  - `data.attributes.length` (integer, required)
    Event duration in seconds

  - `data.attributes.capacity` (integer, required)
    Total number of available places

  - `data.attributes.clients_count` (integer, required)
    Number of Booking Users currently booked

  - `data.attributes.color` (string, required)
    Event background color including #

  - `data.attributes.instructions` (string, required)
    Instructions for Booking Users

  - `data.attributes.stream_link` (string, required)
    Online Event stream link, or an empty string

  - `data.attributes.font_color` (string, required)
    Event text color including #

  - `data.attributes.notified` (boolean, required)
    Whether an Event notification was sent

  - `data.attributes.comment` (string,null, required)
    Event comment

  - `data.attributes.schedule_id` (integer,null, required)
    Event Schedule ID

  - `data.attributes.schedule_till` (any, required)
    Event Schedule end represented by the production DateTime wire object
    - `date` (string, required)
    - `timezone_type` (integer, required)
    - `timezone` (string, required)

  - `data.attributes.schedule_event_modified` (boolean,null, required)
    Whether this scheduled Event differs from its Event Schedule

  - `data.attributes.date` (string, required)
    Event start in the Location timezone with a numeric offset

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.staff` (object)

  - `data.relationships.staff.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `data.relationships.master` (object)

  - `data.relationships.service` (object)

  - `data.relationships.resource_instances` (object)

  - `data.relationships.resource_instances.data` (array, required)

  - `data.relationships.resource_instances.data.type` (string, required)

  - `data.relationships.resource_instances.data.id` (string, required)

  - `data.relationships.labels` (object)

  - `data.relationships.duration_details` (object)

  - `meta` (array, required)
    Empty JSON array returned for an Event item

  - `included` (array)
    Resources requested through include, when available

  - `included.type` (string, required)

  - `included.id` (string, required)

  - `included.attributes` (object, required)

  - `included.relationships` (object)

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


