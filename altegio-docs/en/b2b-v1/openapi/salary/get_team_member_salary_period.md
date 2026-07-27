# Get Payroll for a Specific Team Member for a Given Period

The method allows you to get the calculation for the period for a specific team member.
In the user's access rights, the checkbox "Access to payroll only for a specific team member" must be checked.

Endpoint: GET /company/{location_id}/salary/staff/{team_member_id}/period
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

## Query parameters:

  - `date_from` (string, required)
    Start from date.
    Example: "2026-03-01"

  - `date_to` (string, required)
    End to date.
    Example: "2026-03-31"

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)
    Payroll for a period for a specific team member.

  - `data.working_days_count` (integer)
    Number of working days.

  - `data.working_hours_count` (integer)
    Number of working hours.

  - `data.group_services_count` (integer)
    Number of group services provided.

  - `data.services_count` (integer)
    Number of services provided.

  - `data.services_sum` (string)
    The cost of services provided.

  - `data.goods_sales_count` (integer)
    Number of products sold.

  - `data.goods_sales_sum` (string)
    Cost of products sold.

  - `data.total_sum` (string)
    Total cost.

  - `data.salary` (string)
    Salary.

  - `data.currency` (object)
    Currency.

  - `data.currency.id` (integer)
    Currency identifier

  - `data.currency.iso` (string)
    Three-letter currency code according to ISO 4217

  - `data.currency.name` (string)
    Currency name

  - `data.currency.symbol` (string)
    Currency symbol next to the amount

  - `data.currency.is_symbol_after_amount` (boolean)
    Flag where to display the currency symbol relative to the amount (true - after the amount, false - before)

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


