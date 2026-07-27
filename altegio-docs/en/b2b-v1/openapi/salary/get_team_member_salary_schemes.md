# Obtaining own payroll schemes for a specific team member

The method allows you to get own salary calculation schemes for a specific team member.
In the user's access rights, the checkbox "Access to payroll only for a specific team member" must be specified.

Endpoint: GET /company/{location_id}/salary/staff/{team_member_id}/salary_schemes
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

  - `team_member_id` (integer, required)
    ID of a team member.
    Example: 123

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (array)

  - `data.staff_id` (integer)
    ID of a team member.

  - `data.date_start` (string)
    Start date the salary scheme is applicable.

  - `data.date_end` (string)
    Start date the salary scheme is applicable. Null, if salary scheme is unlimited.

  - `data.salary_scheme` (object)
    Salary scheme.

  - `data.salary_scheme.id` (integer)
    ID of a salary scheme.

  - `data.salary_scheme.title` (string)
    Title of a salary scheme.

  - `meta` (object)
    Additional response data.

  - `meta.count` (number)
    Response data objects count.
    Example: 10

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


