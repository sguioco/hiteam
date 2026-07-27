# Team Member Event

Sent when a team member is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/staff/{staff_id}.

Endpoint: POST StaffEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "staff"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Team member data sent in webhook notifications. Matches the output of the team member detail API.

  - `data.id` (integer)
    Team member ID.

  - `data.api_id` (string)

  - `data.name` (string)
    Full name.

  - `data.specialization` (string)

  - `data.position` (object)
    Position details.

  - `data.position.id` (integer)

  - `data.position.title` (string)

  - `data.show_rating` (integer)
    Enum: 0, 1

  - `data.rating` (number)

  - `data.votes_count` (integer)

  - `data.avatar` (string)
    Avatar thumbnail URL.

  - `data.avatar_big` (string)
    Full-size avatar URL.

  - `data.comments_count` (integer)

  - `data.weight` (integer)
    Sort order.

  - `data.information` (string)
    HTML biography.

  - `data.hidden` (integer)
    Enum: same as `data.show_rating` (2 values)

  - `data.fired` (integer)
    1 — dismissed, 0 — active.
    Enum: same as `data.show_rating` (2 values)

  - `data.status` (integer)
    Enum: same as `data.show_rating` (2 values)

  - `data.position_id` (integer)

  - `data.schedule_till` (string)
    Schedule end date.

  - `data.image_group` (object)
    Image group data.

  - `data.prepaid` (string)
    Prepaid slug.

  - `data.user_id` (integer,null)

  - `data.user` (object,null)

  - `data.user.id` (integer)

  - `data.user.name` (string)

  - `data.user.phone` (string)

  - `data.user.email` (string)

  - `data.user.avatar` (string)

  - `data.has_access_timetable` (boolean)

  - `data.is_paid_staff` (boolean)


## Response 200 fields
