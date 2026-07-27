# Get Team Members Available for Booking

Each object from the array of team members available for booking has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | team member ID |
| name | string | team member name |
| specialization | string | team member specialization |
| position | object | team member position |
| bookable | boolean | Does the team member have sessions available for booking |
| weight | number | team member weight. When withdrawing, team members are sorted by weight, heavier first |
| show_rating | number | Whether to show team member's rating (1 - show, 0 - don't show) |
| rating | number | team member rating |
| votes_count | number | Number of votes rated team member |
| comments_count | number | Number of comments to a team member |
| avatar | string | Path to team member avatar file |
| information | string | Additional information about the team member (HTML format) |
| session_date | string | Date of the next day that there are available sessions (only for bookable = true) |


The following filters are available:

+ service_ids: Array of service IDs. If you need team members who provide only the selected service
+ datetime: date (in iso8601 format). If you need team members who have sessions for the specified service at the specified time

Endpoint: GET /book_staff/{location_id}
Version: 1.0.0
Security: BearerPartner

## Path parameters:

  - `location_id` (number, required)
    location ID
    Example: 4564

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Query parameters:

  - `service_ids[]` (array)
    Service ID.
Filter by the list of service identifiers

  - `datetime` (number)
    date in iso8601 format.
Filter by service booking date (for example '2005-09-09T18:30')

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":16,"name":"James","bookable":true,"specialization":"Paramedic","position":{"id":1,"title":"Administrator"},"show_rating":1,"rating":3,"votes_count":1,"avatar":"https://app.alteg.io/images/no-master.png","comments_count":0,"weight":11,"information":"<span></span>","seance_date":"2026-09-21","seances":[]},{"id":32,"name":"Peter","bookable":false,"specialization":"Therapist","position":{},"show_rating":1,"rating":4,"votes_count":1,"avatar":"https://app.alteg.io/images/no-master.png","comments_count":0,"weight":8,"information":"<span></span>"}]

  - `data.id` (number)
    team member ID

  - `data.api_id` (string,null)
    External team member ID

  - `data.user_id` (number,null)
    User ID associated with team member (can be null if not linked)

  - `data.name` (string)
    team member name

  - `data.bookable` (boolean)
    Does the team member have sessions available for appointment

  - `data.specialization` (string)
    team member specialization

  - `data.position` (any)
    team member's position (object or empty array)
    - `id` (integer)
      Job ID
    - `title` (string)
      Job title
    - `services_binding_type` (integer)
      Services binding type

  - `data.position_id` (number)
    Position ID

  - `data.show_rating` (number)
    Whether to show the team member's rating (1 - show, 0 - do not show)

  - `data.rating` (number)
    team member Rating

  - `data.votes_count` (number)
    Number of votes that rated the team member

  - `data.avatar` (string)
    Path to team member avatar file

  - `data.avatar_big` (string)
    Path to large team member avatar file

  - `data.comments_count` (number)
    Number of comments to the team member

  - `data.weight` (integer)
    team member weight. team members are sorted by weight on exit, heavier first

  - `data.information` (string)
    Additional information about the team member (HTML format)

  - `data.seance_date` (string)
    The date of the next day that there are available sessions (only for bookable = true)

  - `data.schedule_till` (string)
    Schedule available until date

  - `data.seances` (array)
    Available sessions

  - `data.has_access_timetable` (boolean)
    Has access to timetable

  - `data.image_group` (any)
    Image group with different sizes (object or empty array)

  - `data.fired` (integer)
    Whether team member is fired

  - `data.status` (integer)
    Team member status

  - `data.hidden` (integer)
    Whether team member is hidden

  - `data.user` (object,null)
    User information

  - `data.prepaid` (string)
    Prepaid status

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


