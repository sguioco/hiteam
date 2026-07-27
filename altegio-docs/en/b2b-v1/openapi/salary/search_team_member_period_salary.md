# Getting payroll for a period for a team member

The method allows location owner to get the calculation for the period for a team member.

Endpoint: GET /company/{location_id}/salary/period/staff/{team_member_id}
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
    Mutual settlements.

  - `data.total_sum` (object)
    Total sum.

  - `data.total_sum.income` (string)
    Income.

  - `data.total_sum.expense` (string)
    Expense.

  - `data.total_sum.balance` (string)
    Balance.

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


