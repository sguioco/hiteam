# Schedule Event

Sent when a team member's schedule is created, updated, or deleted. The resource_id refers to the team member (staff) ID whose schedule changed. The data field is always an empty array for schedule events.

Endpoint: POST ScheduleEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "schedule"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (array, required)
    Always empty for schedule events.


## Response 200 fields
