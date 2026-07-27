# Create and Send an Invitation

An invitation to manage a location is sent via email or phone as a link. By following the link and completing registration, the user gains access to manage the location according to the permissions assigned.
Permission assignment is performed in a separate request after the invitation is sent.

Endpoint: POST /user/invite/{location_id}
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

  - `invites` (array, required)
    Array of invites

  - `invites.name` (string)
    User name
    Example: "Olivia"

  - `invites.search` (string)
    Phone number or email address of the user
    Example: "mail@gmail.com"

  - `invites.position` (string,null)
    Position
    Example: "Administrator"

  - `invites.user_role` (string,null)
    Role name
    Enum: "worker", "administrator", "accountant", "manager", "owner"

  - `invites.user_permissions` (array,null)
    List of user permissions
    Example: [{"slug":"timetable_access","value":true}]

  - `invites.user_permissions.slug` (string)
    Name of permission
    Example: "timetable_access"

  - `invites.user_permissions.value` (any)
    Value of permission (can be number, string, boolean, or array)
    Example: true

  - `invites.staff_id` (number,null)
    team member ID bound to user
    Example: 12

## Response 202 fields (application/json):

  - `success` (boolean)
    Send success status (true)
    Example: true

  - `data` (string)
    Is null

  - `meta` (object)
    Metadata (contains a message that the data has been saved)
    Example: {"message":"Saved"}

  - `meta.message` (string)
    Example: "Saved"

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


