# Update a schedule series

Updates the settings of a schedule series for appointments or events.

Endpoint: PATCH /company/{location_id}/schedules/{schedule_id}/days/{day_id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

  - `schedule_id` (integer, required)
    ID of a schedule.
    Example: 123

  - `day_id` (number, required)
    ID of a schedule series.
    Example: 123

## Query parameters:

  - `include` (array)
    Requested set of an included models.
    Enum: "events_master", "events_labels", "events_resource_instances", "events"

## Request fields (application/json):

  - `force` (boolean, required)
    Flag for force override of manual changes in scheduled appointments/events.

  - `events_master_id` (number)
    The ID of the team member assigned to the events in the schedule series.
    Example: 123

  - `events_time` (string)
    Start time of the events in the schedule series, formatted as HH:MM:SS.
    Example: "14:00:00"

  - `events_duration` (number)
    Duration of each event in the schedule series, in seconds.
    Example: 3600

  - `events_capacity` (number)
    The capacity of activities in the schedule series. For appointments, this should be set to 1.
    Example: 4

  - `labels_ids` (array)
    An array of tag IDs associated with the events in the schedule series.
    Example: [123]

  - `resource_instances_ids` (array)
    An array of resource instance IDs used in the events of the schedule series.
    Example: [123]

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Data for an existing schedule series in a location.

  - `data.id` (number)
    ID of a schedule series.

  - `data.created_at` (string)
    Datetime of a schedule series created.

  - `data.updated_at` (string)
    Datetime of a schedule series last updated.

  - `data.deleted_at` (string,null)
    Datetime of a schedule series deleted.

  - `data.timetable_event_schedule_id` (number)
    ID of a schedule, which series is linked to.

  - `data.day_of_week` (string)
    Day of week of a schedule series.
    Enum: "mon", "tue", "wed", "thu", "fri", "sat", "sun"

  - `data.events_time` (string)
    Time of beginning of the events in a schedule series.

  - `data.events_duration` (number)
    Duration of the events in a schedule series.
Note: Does not include technical break duration.

  - `data.event_technical_break_duration` (number)
    Technical break duration in seconds.

  - `data.events_master` (object)
    Team member for the events in a schedule series.  
Returned in response only if corresponding include is present in request.
    Example: {"id":123,"name":"John Johnson","company_id":123,"specialization":"Master","avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","position":{"id":123,"title":"Position"},"is_paid_staff":false}

  - `data.events_master.id` (number)
    ID of a team member.
    Example: 123

  - `data.events_master.name` (string)
    Name of a team member.
    Example: "John Johnson"

  - `data.events_master.company_id` (number)
    ID of a location, where team member was created.
    Example: 123

  - `data.events_master.specialization` (string)
    Specialization of a team member.
    Example: "Master"

  - `data.events_master.avatar` (string)
    Link to the avatar of a team member (small).
    Example: "https://app.alteg.io/images/no-master-sm.png"

  - `data.events_master.avatar_big` (string)
    Link to the avatar of a team member (original).
    Example: "https://app.alteg.io/images/no-master.png"

  - `data.events_master.position` (object,null)
    Position of a team member.
    Example: {"id":123,"title":"Position"}

  - `data.events_master.is_paid_staff` (boolean)
    Whether the team member is a paid staff member counted in license price.

  - `data.events_labels` (array)
    Tags for the events in a schedule series.
Returned in response only if corresponding include is present in request.
    Example: [{"id":123,"title":"Tag","color":"#ff0000"}]

  - `data.events_labels.id` (number)
    ID of tag.
    Example: 123

  - `data.events_labels.title` (string)
    Title of a tag.
    Example: "Tag"

  - `data.events_labels.color` (string)
    Color of a tag (#rrggbb).
    Example: "#ff0000"

  - `data.events_resource_instances` (array)
    Resource instances for the events in a schedule series.  
Returned in response only if corresponding include is present in request.
    Example: [{"id":123,"title":"Resource #1","resource_id":123}]

  - `data.events_resource_instances.id` (number)
    ID of a resource instance.
    Example: 123

  - `data.events_resource_instances.title` (string)
    Title of a resource instance.
    Example: "Resource #1"

  - `data.events_resource_instances.resource_id` (number)
    ID of a resource, to which instance is linked.
    Example: 123

  - `data.events` (array)
    Events of appointments or events in a schedule series.  
Returned in response only if corresponding include is present in request.
    Example: [{"id":123,"created_at":"2026-01-01T12:12:12-05:00","updated_at":"2026-01-01T12:12:12-05:00","deleted_at":null,"event_status":"stable","event_datetime":"2026-01-24T14:00:00-05:00","event_entity_type":"activity","event_entity_id":123,"is_entity_master_changed":false,"is_entity_datetime_changed":false,"is_entity_duration_changed":false,"is_entity_labels_changed":false,"is_entity_resource_instances_changed":false,"entity_master":{"id":123,"name":"John Johnson","company_id":123,"specialization":"Team Member","avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","position":{"id":123,"title":"Team Member"}},"entity_datetime":"2022-01-24 14:00:00","entity_duration":3600,"entity_labels":[{"id":123,"title":"Tag","color":"#ff0000"}],"entity_resource_instances":[{"id":123,"title":"Resource #1","resource_id":123}]}]

  - `data.events.id` (number)
    ID of an event of appointment/event in a schedule.
    Example: 123

  - `data.events.created_at` (string)
    Datetime of an event of appointment/event in a schedule created.
    Example: "2026-01-01T12:12:12-05:00"

  - `data.events.updated_at` (string)
    Datetime of an event of appointment/event in a schedule last updated.
    Example: "2026-01-01T12:12:12-05:00"

  - `data.events.deleted_at` (string,null)
    Datetime of an event of appointment/event in a schedule deleted.

  - `data.events.event_status` (string)
    Event of appointment/event status:  
stable - entity is stable;  
event_created - event is created, corresponding appointment/event is not created yet;  
event_changed - event is changed, corresponding appointment/event is not changed yet;  
event_changed_force - event is changed with force override of manual changes, corresponding appointment/event is not changed yet;  
event_deleted - event is deleted, corresponding appointment/event is not deleted yet;  
entity_deleted - appointment/event corresponding to an event is deleted (due to event deletion or due to manual deletion);  
entity_failed - appointment/event creation failure.
    Enum: "stable", "event_created", "event_changed", "event_changed_force", "event_deleted", "entity_deleted", "entity_failed"

  - `data.events.event_datetime` (string)
    Datetime of a scheduled appointment/event beginning.
    Example: "2026-01-24T14:00:00-05:00"

  - `data.events.event_entity_type` (string)
    Type of an scheduled entity (appointment or event). Note: enum values "record" and "activity" are legacy terms for appointment and event.
    Enum: "record", "activity"

  - `data.events.event_entity_id` (number,null)
    ID of an scheduled entity (appointment or event).
    Example: 123

  - `data.events.is_entity_master_changed` (boolean)
    Flag for manual change of a team member for a scheduled appointment/event.

  - `data.events.is_entity_datetime_changed` (boolean)
    Flag for manual change of a datetime for a scheduled appointment/event.

  - `data.events.is_entity_duration_changed` (boolean)
    Flag for manual change of a duration for a scheduled appointment/event.

  - `data.events.is_entity_labels_changed` (boolean)
    Flag for manual change of a tags linked to a scheduled appointment/event.

  - `data.events.is_entity_resource_instances_changed` (boolean)
    Flag for manual change of a resource instances linked to a scheduled appointment/event.

  - `data.events.entity_master` (object)
    Team member for a scheduled appointment/event.
    Example: {"id":123,"name":"John Johnson","company_id":123,"specialization":"Master","avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","position":{"id":123,"title":"Position"},"is_paid_staff":false}

  - `data.events.entity_master.id` (number)
    ID of a team member.
    Example: 123

  - `data.events.entity_master.name` (string)
    Name of a team member.
    Example: "John Johnson"

  - `data.events.entity_master.company_id` (number)
    ID of a location, where team member was created.
    Example: 123

  - `data.events.entity_master.specialization` (string)
    Specialization of a team member.
    Example: "Master"

  - `data.events.entity_master.avatar` (string)
    Link to the avatar of a team member (small).
    Example: "https://app.alteg.io/images/no-master-sm.png"

  - `data.events.entity_master.avatar_big` (string)
    Link to the avatar of a team member (original).
    Example: "https://app.alteg.io/images/no-master.png"

  - `data.events.entity_master.position` (object,null)
    Position of a team member.
    Example: {"id":123,"title":"Position"}

  - `data.events.entity_master.is_paid_staff` (boolean)
    Whether the team member is a paid staff member counted in license price.

  - `data.events.entity_datetime` (string)
    Actual datetime of a scheduled appointment/event beginning.
    Example: "2022-01-24 14:00:00"

  - `data.events.entity_duration` (string)
    Actual duration of a scheduled appointment/event.
    Example: 3600

  - `data.events.entity_labels` (array)
    Actual tags linked to a scheduled appointment/event.
    Example: [{"id":123,"title":"Tag","color":"#ff0000"}]

  - `data.events.entity_resource_instances` (array)
    Actual resource instances linked to a scheduled appointment/event.
    Example: [{"id":123,"title":"Resource #1","resource_id":123}]

  - `meta` (object,array)
    Additional response data (empty object or empty array)

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

## Response 422 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "An error has occurred."

  - `meta.errors` (array)
    Set of a validation error messages.


