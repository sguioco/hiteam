# Getting permission values and user role

Return user role and list of permissions values.

Endpoint: GET /company/{location_id}/users/{user_id}/permissions
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

  - `user_id` (number, required)
    ID of a user.
    Example: 123

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Data on the permissions and user role

  - `data.user_role` (string)
    Name of role
    Enum: "worker", "administrator", "accountant", "manager", "owner", "free_readonly", "free_readonly_admin"

  - `data.staff_id` (number,null)
    team member ID linked to user

  - `data.is_editable` (boolean)
    Are the permissions and role available for editing

  - `data.has_any_paid_permission` (boolean,null)
    Whether the user has at least one paid permission assigned

  - `data.user_permissions` (array)
    List of user permissions values
    Example: [{"slug":"timetable_access","value":true}]

  - `data.user_permissions.slug` (string)
    Name of permission
    Example: "timetable_access"

  - `data.user_permissions.value` (any)
    Value of permission (can be number, string, boolean, or array)
    Example: true

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


