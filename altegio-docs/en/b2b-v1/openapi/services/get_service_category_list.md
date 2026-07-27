# Get a list of service categories

+ Options
    + company_id (required, number) - location ID
    + id (optional, number) - service category ID (to work with a specific category)
    + staff_id (optional, number) - team member ID (to get categories associated with a team member)

Endpoint: GET /company/{location_id}/service_categories/{id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `id` (number, required)
    Service Category ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `staff_id` (number)
    team member ID (to get categories associated with a team member)

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects
    Example: [{"id":345,"salon_service_id":353,"title":"Haircuts for men","api_id":"adw322","weight":10,"staff":[5006,8901,26514,26516,26519,26520]},{"id":3456,"salon_service_id":3252,"title":"Haircuts for women","api_id":"adw323","weight":9,"staff":[5006,8901]}]

  - `data.id` (number)
    Category ID

  - `data.salon_service_id` (number)
    Category ID for the location on the chain

  - `data.title` (string)
    name of category

  - `data.api_id` (string)
    External Category ID

  - `data.weight` (number)
    Category weight (used to sort categories when displayed)

  - `data.staff` (array)
    List of team member IDs providing the service

  - `data.is_chain` (boolean)
    Whether category belongs to chain

  - `meta` (any)
    Metadata (object with total_count or empty array)
    Example: {"total_count":2}
    - `total_count` (number)
      Number of categories found
      Example: 2

## Response 403 fields (application/json):

  - `success` (boolean)
    Execution success status (true)

  - `data` (string)
    is null

  - `meta` (object)
    Metadata (error message)
    Example: {"message":"It is necessary to renew the license in the branch with id: {company_id}"}

  - `meta.message` (string)
    Error message
    Example: "It is necessary to renew the license in the branch with id: {company_id}"

## Response 404 fields (application/json):

  - `success` (boolean)
    Execution success status (true)

  - `data` (string)
    is null

  - `meta` (object)
    Metadata (contains possible error messages)
    Example: {"message":"Possible error messages","errors":[{"message":"Location not specified."},{"message":"Location not found."},{"message":"Service category does not exist."},{"message":"Team Member not found."}]}

  - `meta.message` (string)
    Error message
    Example: "Possible error messages"

  - `meta.errors` (array)
    List of error messages
    Example: [{"message":"Location not specified."},{"message":"Location not found."},{"message":"Service category does not exist."},{"message":"Team Member not found."}]

  - `meta.errors.message` (string)


