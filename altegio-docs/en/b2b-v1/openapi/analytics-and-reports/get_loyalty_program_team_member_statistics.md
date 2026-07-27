# Get team member return

The method allows you to get the return statistics for a team member

Endpoint: GET /company/{location_id}/analytics/loyalty_programs/staff
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Query parameters:

  - `date_to` (string, required)
    Period end date

  - `date_from` (string, required)
    Period start date

  - `loyalty_program_id` (string, required)
    Promotion ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer bearer_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status
    Example: true

  - `data` (array)
    Array with data objects
    Example: [{"client_stats":{"all_count":1,"lost_count":0,"returned_count":1,"returned_percent":100},"staff":{"id":1140369,"name":"Doniella Davy"}}]

  - `data.client_stats` (object)
    Client statistics

  - `data.client_stats.all_count` (integer)
    Number of all clients

  - `data.client_stats.lost_count` (integer)
    Number of lost customers

  - `data.client_stats.returned_count` (integer)
    Number of returning customers

  - `data.client_stats.returned_percent` (number)
    Percentage of returning customers

  - `data.staff` (object)
    team member

  - `data.staff.id` (integer)
    team member ID

  - `data.staff.name` (string)
    team member name

  - `meta` (object)
    Metadata (contains the number of objects found)
    Example: {"count":1}

  - `meta.count` (integer)
    Example: 1

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


