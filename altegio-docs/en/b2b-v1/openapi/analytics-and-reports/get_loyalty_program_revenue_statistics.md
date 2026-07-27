# Get revenue statistics

The method allows you to get statistics on revenue.

Endpoint: GET /company/{location_id}/analytics/loyalty_programs/income
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

  - `data` (object)
    Object with data
    Example: {"income_stats":{"new":{"all_sum":0,"returned_sum":0},"old":{"all_sum":0,"returned_sum":0},"total":{"all_sum":0,"returned_sum":0}},"currency":{"id":1,"iso":"USD","name":"US Dollar","symbol":"USD","is_symbol_after_amount":true},"income_stats_by_day":[{"date":"2026-09-21","new_sum":0,"old_sum":0},{"date":"2026-09-21","new_sum":0,"old_sum":0}]}

  - `data.income_stats` (object)
    revenue statistics
    Example: {"new":{"all_sum":0,"returned_sum":0},"old":{"all_sum":0,"returned_sum":0},"total":{"all_sum":0,"returned_sum":0}}

  - `data.income_stats.new` (object)
    New clients
    Example: {"all_sum":0,"returned_sum":0}

  - `data.income_stats.new.all_sum` (integer)
    Revenue from new customers

  - `data.income_stats.new.returned_sum` (integer)
    Revenue from returning customers

  - `data.income_stats.old` (object)
    Old clients
    Example: {"all_sum":0,"returned_sum":0}

  - `data.income_stats.old.all_sum` (integer)
    Revenue from old customers

  - `data.income_stats.old.returned_sum` (integer)
    Revenue from returning customers

  - `data.income_stats.total` (object)
    Total amount
    Example: {"all_sum":0,"returned_sum":0}

  - `data.income_stats.total.all_sum` (integer)
    Revenue for all customers

  - `data.income_stats.total.returned_sum` (integer)
    Revenue from returning customers

  - `data.currency` (object)
    Currency
    Example: {"id":1,"iso":"USD","name":"US Dollar","symbol":"USD","is_symbol_after_amount":true}

  - `data.currency.id` (integer)
    Currency identifier
    Example: 1

  - `data.currency.iso` (string)
    Name in the ISO system
    Example: "USD"

  - `data.currency.name` (string)
    Full title
    Example: "US Dollar"

  - `data.currency.symbol` (string)
    Currency symbol
    Example: "USD"

  - `data.currency.is_symbol_after_amount` (boolean)
    Example: true

  - `data.income_stats_by_day` (array)
    Revenue statistics by day
    Example: [{"date":"2026-09-21","new_sum":0,"old_sum":0},{"date":"2026-09-21","new_sum":0,"old_sum":0}]

  - `data.income_stats_by_day.date` (string)
    date

  - `data.income_stats_by_day.new_sum` (integer)
    Revenue from new customers

  - `data.income_stats_by_day.old_sum` (integer)
    Revenue from old customers

  - `meta` (array)
    Metadata (empty array)
    Example: []

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


