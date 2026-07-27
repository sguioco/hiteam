# Quick create a team member

Creates a new team member with a minimal set of parameters.

Endpoint: POST /company/{location_id}/staff/quick
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

## Request fields (application/json):

  - `name` (string, required)
    Name of a team member.
    Example: "John Johnson"

  - `specialization` (string, required)
    Specialization of a team member.
    Example: "Cosmetologist"

  - `position_id` (number,null, required)
    ID of a position that should be linked to a team member.
    Example: 123

  - `phone_number` (string,null, required)
    Phone number of a user that should be linked to a team member (without "+", 9 to 15 digits).
    Example: 11234567890

  - `user_email` (string, required)
    Email address of the user to be created or linked to the team member.
    Example: "john.johnson@example.com"

  - `user_phone` (string, required)
    User phone number (without "+", 9 to 15 digits). Can be the same as phone_number or different for user account login.
    Example: 11234567890

  - `is_user_invite` (boolean, required)
    Whether to send an invitation email to the user. Set to true to send invitation, false to create without sending invitation.

  - `is_paid_staff` (boolean)
    Whether the team member is a paid staff member.

## Response 201 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)

  - `data.id` (number)
    ID of a team member.

  - `data.name` (string)
    Name of a team member.

  - `data.company_id` (number)
    ID of a location, where team member was created.

  - `data.specialization` (string)
    Specialization of a team member.

  - `data.avatar` (string)
    Link to the avatar of a team member (small).

  - `data.avatar_big` (string)
    Link to the avatar of a team member (original).

  - `data.position` (object,null)
    Position of a team member.

  - `data.is_paid_staff` (boolean)
    Whether the team member is a paid staff member counted in license price.

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


