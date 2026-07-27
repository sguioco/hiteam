# Get list of team members

Returns all team members for the specified location.

Each team member includes:
- Basic info (name, specialization, avatar)
- Rating and reviews data
- Schedule availability
- Position and status

Endpoint: GET /staff/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (integer, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    API version header

  - `Authorization` (string, required)
    Bearer {partner_token}

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of team members
    Example: [{"id":2940951,"api_id":null,"name":"John Smith","specialization":"Hair Stylist","rating":4.8,"show_rating":1,"user_id":null,"has_access_timetable":false,"avatar":"https://be.cdn.alteg.io/images/no-master-sm.png","avatar_big":"https://be.cdn.alteg.io/images/no-master.png","comments_count":15,"votes_count":20,"bookable":true,"image_group":[],"information":"Senior stylist with 10 years experience","position_id":1,"schedule_till":"2026-12-31","weight":100,"fired":0,"status":0,"hidden":0,"user":[],"prepaid":"forbidden","position":{"id":1,"title":"Senior Stylist"}}]

  - `data.id` (integer)
    Team member ID

  - `data.api_id` (integer,null)
    External API ID (for integrations)

  - `data.name` (string)
    Team member name

  - `data.specialization` (string)
    Team member specialization/title

  - `data.rating` (number)
    Average rating score

  - `data.show_rating` (integer)
    Whether to show rating (1 = show, 0 = hide)

  - `data.user_id` (integer,null)
    Linked user account ID

  - `data.has_access_timetable` (boolean)
    Whether team member has access to timetable management

  - `data.avatar` (string)
    URL to small avatar image

  - `data.avatar_big` (string)
    URL to large avatar image

  - `data.comments_count` (integer)
    Number of comments/reviews

  - `data.votes_count` (integer)
    Number of rating votes

  - `data.bookable` (boolean)
    Whether team member is available for online booking

  - `data.image_group` (array)
    Additional images

  - `data.information` (string)
    Additional information/bio

  - `data.position_id` (integer)
    Position/role ID

  - `data.schedule_till` (string)
    Schedule available until date (YYYY-MM-DD)

  - `data.weight` (integer)
    Sort order weight

  - `data.fired` (integer)
    Fired status (1 = fired, 0 = active)

  - `data.status` (integer)
    Status flag (1 = removed, 0 = active)

  - `data.hidden` (integer)
    Hidden from online booking (1 = hidden, 0 = visible)

  - `data.user` (array)
    Linked user data

  - `data.prepaid` (string)
    Prepayment requirement (forbidden, allowed, required)

  - `data.position` (any)
    Position object or empty array if unassigned
    - `id` (integer)
    - `title` (string)

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


