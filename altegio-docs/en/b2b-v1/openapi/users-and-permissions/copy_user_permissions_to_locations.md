# Copy a User to Companies

Copies an active user and their permissions to multiple locations at once. If the user does not yet exist in a location, they will be added as an active user. If the user has already been invited to the location, only their permissions will be updated — however, they will still need to accept the invitation.

Endpoint: POST /company/{location_id}/users/{user_id}/copy_to_companies
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

## Request fields (application/json):

  - `user_company_links` (array, required)
    List of locations to copy the user to

  - `user_company_links.company_id` (number, required)
    location ID
    Example: 123

  - `user_company_links.user_permissions` (array)
    User permission values to override on copying
    Example: [{"slug":"timetable_access","value":true}]

  - `user_company_links.user_permissions.slug` (string)
    Name of permission
    Example: "timetable_access"

  - `user_company_links.user_permissions.value` (any)
    Value of permission (can be number, string, boolean, or array)
    Example: true

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

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


