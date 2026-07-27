# Add new team member

Endpoint: POST /staff/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `name` (string)
    team member name
    Example: "Basil"

  - `specialization` (string)
    team member specialization
    Example: "the hairdresser"

  - `weight` (number)
    team member weight. team members are sorted by weight on exit, heavier first
    Example: 10

  - `information` (string)
    team member information (HTML format)
    Example: "Trimming with three hands"

  - `api_id` (string)
    External team member ID
    Example: "42"

  - `hidden` (number)
    Display status in online appointment, 1 - hidden, 0 - not hidden

  - `fired` (number)
    the team member's dismissal status, 1 - dismissed, 0 - not dismissed

  - `user_id` (number)
    Linked user ID, 0 - unlink user
    Example: 123

  - `has_access_timetable` (boolean)
    Whether the team member has access to the appointment calendar (can have working hours set).

When true, the team member can be assigned schedules and appear in booking.
When false (default for new team members), schedule-related operations will fail.

Note: This may be limited by your subscription plan.
    Example: true

  - `is_paid_staff` (boolean)
    Whether the team member is a paid staff member (optional)

  - `is_included_in_payment_policy` (boolean)
    Whether the team member is included in the location''s active payment policy scope (optional).

Toggling this field requires the payment_policy_update_access permission; otherwise the request fails with 403.
The field is silently ignored when the payment_policy feature is disabled for the location or no active payment policy exists.
    Example: true

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Team member data object
    Example: {"id":1001539,"name":"team member 1","company_id":176275,"specialization":"team member","position":{"id":1,"title":"Administrator"},"avatar":"https://app.alteg.io/images/no-master-sm.png","avatar_big":"https://app.alteg.io/images/no-master.png","fired":0,"status":0,"hidden":0,"user_id":12345,"is_paid_staff":false,"is_included_in_payment_policy":true}

  - `data.id` (number)
    team member ID
    Example: 1001539

  - `data.name` (string)
    team member name
    Example: "team member 1"

  - `data.company_id` (number)
    location ID
    Example: 176275

  - `data.specialization` (string)
    team member specialization
    Example: "team member"

  - `data.position` (any)
    Team member's position (object when assigned, null or empty array when unassigned)
    Example: {"id":1,"title":"Administrator"}
    - `id` (number)
      Job ID
      Example: 1
    - `title` (string)
      Job title
      Example: "Administrator"

  - `data.avatar` (string)
    Path to team member avatar file
    Example: "https://app.alteg.io/images/no-master-sm.png"

  - `data.avatar_big` (string)
    The path to the team member's avatar file in a higher resolution
    Example: "https://app.alteg.io/images/no-master.png"

  - `data.fired` (number)
    Whether the team member was fired, 1 - fired, 0 - not fired

  - `data.status` (number)
    Is the team member removed, 1 - removed, 0 - not removed

  - `data.hidden` (number)
    Whether the team member is hidden for online appointment, 1 - hidden, 0 - not hidden

  - `data.user_id` (number,null)
    team member's linked user ID
    Example: 12345

  - `data.is_paid_staff` (boolean)
    Whether the team member is a paid staff member counted in license price

  - `data.is_included_in_payment_policy` (boolean)
    Whether the team member is included in the location''s active payment policy scope.

Always returned. Defaults to true when the payment_policy feature is disabled for the location or no active payment policy exists.
    Example: true

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


