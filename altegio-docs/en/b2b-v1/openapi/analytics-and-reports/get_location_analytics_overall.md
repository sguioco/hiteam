# Get key location metrics

The method allows you to get the main indicators of the location for the selected period and compare with the previous period of the same duration

Endpoint: GET /company/{location_id}/analytics/overall
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `location_id` (number, required)
    location ID

## Query parameters:

  - `date_from` (string, required)
    Start date of the analyzed period

  - `date_to` (string, required)
    End date of the analyzed period (included in the report)

  - `team_member_id` (integer)
    ID of the location team member whose work needs to be analyzed

  - `position_id` (integer)
    location position ID to analyze the work of all team members belonging to the same position

  - `user_id` (integer)
    The user ID of the location whose work you want to analyze

## Response 200 fields (application/json):

  - `data` (object, required)
    Summary indicators

  - `data.income_total_stats` (object)

  - `data.income_total_stats.current_sum` (string)
    The current value of the indicator

  - `data.income_total_stats.previous_sum` (string)
    The value of the indicator in the previous period

  - `data.income_total_stats.change_percent` (integer)
    The percentage change in the current value of the indicator relative to the past. Null if the previous value is 0 and the current value is not 0.

  - `data.income_total_stats.currency` (object)
    Currency

  - `data.income_total_stats.currency.id` (integer)
    Currency identifier

  - `data.income_total_stats.currency.iso` (string)
    Three-letter currency code according to ISO 4217

  - `data.income_total_stats.currency.name` (string)
    Currency name

  - `data.income_total_stats.currency.symbol` (string)
    Currency symbol next to the amount

  - `data.income_total_stats.currency.is_symbol_after_amount` (boolean)
    Flag where to display the currency symbol relative to the amount (true - after the amount, false - before)

  - `data.income_services_stats` (object)

  - `data.income_goods_stats` (object)

  - `data.income_average_stats` (object)

  - `data.income_average_services_stats` (object)

  - `data.fullness_stats` (object)
    Summary indicators of the occupancy of the working hours of the location's team members

  - `data.fullness_stats.current_percent` (number)
    Percentage of occupancy in the current period

  - `data.fullness_stats.previous_percent` (number)
    Percentage of occupancy in the previous period

  - `data.fullness_stats.change_percent` (integer)
    The percentage change in the current value of the indicator relative to the past. Null if the previous value is 0 and the current value is not 0.

  - `data.record_stats` (object)
    Summary metrics by number of appointments

  - `data.record_stats.current_completed_count` (integer)
    Number of completed appointments

  - `data.record_stats.current_completed_percent` (integer)
    Percentage of completed appointments relative to the total. Null if the total is 0.

  - `data.record_stats.current_pending_count` (integer)
    Number of pending appointments

  - `data.record_stats.current_pending_percent` (integer)
    Percentage of incomplete records relative to the total. Null if the total is 0.

  - `data.record_stats.current_canceled_count` (integer)
    Number of canceled appointments

  - `data.record_stats.current_canceled_percent` (integer)
    The percentage of canceled appointments relative to the total. Null if the total is 0.

  - `data.record_stats.current_total_count` (integer)
    Number of all appointments in the current period

  - `data.record_stats.previous_total_count` (integer)
    Number of all appointments in the previous period

  - `data.record_stats.change_percent` (integer)
    The percentage change in the current value of the total number of records relative to the past. Null if the number of records in the previous period is 0 and the current number is different from 0.

  - `data.client_stats` (object)
    Summary indicators by number of clients

  - `data.client_stats.total_count` (integer)
    Total number of clients

  - `data.client_stats.new_count` (integer)
    Number of new clients in the analyzed period

  - `data.client_stats.new_percent` (integer)
    Percentage of new customers relative to the number of active customers

  - `data.client_stats.return_count` (integer)
    The number of customers who returned in the analyzed period

  - `data.client_stats.return_percent` (integer)
    Percentage of returning customers relative to the number of active customers

  - `data.client_stats.active_count` (integer)
    Number of active clients in the analyzed period

  - `data.client_stats.lost_count` (integer)
    The number of lost customers in the analyzed period

  - `data.client_stats.lost_percent` (integer)
    The percentage of lost customers relative to the total number of customers

  - `meta` (array, required)
    metadata

  - `success` (boolean, required)
    Execution success status (true)

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


