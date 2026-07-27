# Getting payroll for a period for a team member grouped by date

The method allows location owner to get the calculation for the period for a team member grouped by date.

Endpoint: GET /company/{location_id}/salary/period/staff/daily/{team_member_id}
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
    Payroll for a period for a specific team member grouped by date.

  - `data.period_calculation_daily` (array)

  - `data.period_calculation_daily.date` (string)
    Date.

  - `data.period_calculation_daily.period_calculation` (object)
    Calculations for this date.

  - `data.period_calculation_daily.period_calculation.working_days_count` (integer)
    Number of working days.

  - `data.period_calculation_daily.period_calculation.working_hours_count` (integer)
    Number of working hours.

  - `data.period_calculation_daily.period_calculation.group_services_count` (integer)
    Number of group services provided.

  - `data.period_calculation_daily.period_calculation.services_count` (integer)
    Number of services provided.

  - `data.period_calculation_daily.period_calculation.services_sum` (string)
    The cost of services provided.

  - `data.period_calculation_daily.period_calculation.goods_sales_count` (integer)
    Number of products sold.

  - `data.period_calculation_daily.period_calculation.goods_sales_sum` (string)
    Cost of products sold.

  - `data.period_calculation_daily.period_calculation.total_sum` (string)
    Total cost.

  - `data.period_calculation_daily.period_calculation.salary` (string)
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


