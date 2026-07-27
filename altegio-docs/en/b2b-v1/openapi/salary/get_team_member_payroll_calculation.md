# Get payroll calculation details of a team member

The method allows location owner to get details of a specific payroll calculation.

Endpoint: GET /company/{location_id}/salary/payroll/staff/{team_member_id}/calculation/{calculation_id}
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

  - `calculation_id` (number, required)
    ID of a salary calculation.
    Example: 789

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object)

  - `data.id` (number)
    ID of calculation.

  - `data.company_id` (number)
    ID of a location.

  - `data.staff_id` (number)
    ID of a team member.

  - `data.amount` (number)
    Calculated salary amount.

  - `data.status` (string)
    Calculation status.
    Enum: "draft", "confirmed"

  - `data.date_create` (string)
    Date of calculation creation.

  - `data.date_from` (string)
    Date of calculation period start.

  - `data.date_to` (string)
    Date of calculation period end.

  - `data.comment` (string)
    Calculation comment.

  - `data.salary_items` (array)
    Salary calculation items.

  - `data.salary_items.date` (string)
    Date.

  - `data.salary_items.time` (string)
    Time.

  - `data.salary_items.item_id` (number)
    ID of an entity subject to salary calculation (e.g., appointment ID or sale ID).

  - `data.salary_items.item_type_slug` (string)
    Type of an entity subject to salary calculation (e.g., appointment or sale).
    Enum: "periodic", "sale", "record", "bonus", "penalty", "retro_bonus", "activity"

  - `data.salary_items.salary_sum` (string)
    Calculated salary sum.

  - `data.salary_items.record_id` (number,null)
    ID of an appointment.

  - `data.salary_items.client_id` (number,null)
    ID of a customer.

  - `data.salary_items.cost` (string,null)
    Base cost.

  - `data.salary_items.paid` (object,null)
    Payment details.

  - `data.salary_items.salary_calculation_info` (object)
    Payroll calculation rules details.

  - `data.salary_items.salary_calculation_info.criteria_title` (string)
    Salary payroll criterium title.

  - `data.salary_items.salary_calculation_info.param_title` (string)
    Salary payroll parameter title.

  - `data.salary_items.salary_calculation_info.scheme_title` (string)
    Salary payroll scheme title.

  - `data.salary_items.targets` (array)

  - `data.salary_items.targets.target_type_slug` (string,null)
    Type of a target.
    Enum: "service", "good"

  - `data.salary_items.targets.target_id` (number,null)
    ID of a target.

  - `data.salary_items.targets.title` (string)
    Title of a target.

  - `data.salary_items.targets.cost` (string,null)
    Sale cost of a target.

  - `data.salary_items.targets.net_cost` (string,null)
    Net cost of a target.

  - `data.salary_items.targets.salary_sum` (string,null)
    Total calculated salary sum for a target.

  - `data.salary_items.targets.salary_promotion_sum` (string,null)
    Calculated salary sum for the promotion of a target.

  - `data.salary_items.targets.salary_calculation` (object,null)
    Target salary calculation rule.

  - `data.salary_items.salary_discrepancy` (object,null)
    Payroll calculation discrepancy details (if any).

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


