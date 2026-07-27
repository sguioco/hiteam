# Get Team Members / Specific Team Member

Endpoint: GET /company/{location_id}/staff/{team_member_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

  - `team_member_id` (number, required)
    team member ID, if you need to work with a specific team member.

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

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

## Response 403 fields (application/json):

  - `success` (boolean)
    Execution success status (false)

  - `data` (string)
    Contains null

  - `meta` (object)
    Metadata (contains an error message)
    Example: {"message":"It is necessary to renew the license in the branch with id: {company_id}"}

  - `meta.message` (string)
    Example: "It is necessary to renew the license in the branch with id: {company_id}"

## Response 404 fields (application/json):

  - `success` (boolean)
    Execution success status (false)

  - `meta` (object)
    Metadata (contains an error message)
    Example: {"message":"Possible error messages","errors":[{"message":"Location not specified."},{"message":"Team Member not listed"},{"message":"Team Member with ID {staff_id} was not found in branch {company_id}."}]}

  - `meta.message` (string)
    Example: "Possible error messages"

  - `meta.errors` (array)
    Example: [{"message":"Location not specified."},{"message":"Team Member not listed"},{"message":"Team Member with ID {staff_id} was not found in branch {company_id}."}]

  - `meta.errors.message` (string)


