# Get customer statistics

The method allows you to get statistics on returning, new and lost customers

Endpoint: GET /company/{location_id}/analytics/loyalty_programs/visits
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
    Example: {"client_stats":{"new":{"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0},"old":{"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0},"total":{"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0}},"visits_stats_by_day":[{"date":"2026-09-21","new_count":0,"old_count":0},{"date":"2026-09-21","new_count":0,"old_count":0}]}

  - `data.client_stats` (object)
    Client statistics
    Example: {"new":{"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0},"old":{"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0},"total":{"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0}}

  - `data.client_stats.new` (object)
    New clients
    Example: {"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0}

  - `data.client_stats.new.all_count` (integer)
    Total

  - `data.client_stats.new.lost_count` (integer)
    Lost Clients

  - `data.client_stats.new.returned_count` (integer)
    Returning clients

  - `data.client_stats.new.returned_percent` (number)
    Percentage of returning customers

  - `data.client_stats.old` (object)
    Old clients
    Example: {"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0}

  - `data.client_stats.old.all_count` (integer)
    Total

  - `data.client_stats.old.lost_count` (integer)
    Lost Clients

  - `data.client_stats.old.returned_count` (integer)
    Returning clients

  - `data.client_stats.old.returned_percent` (number)
    Percentage of returning customers

  - `data.client_stats.total` (object)
    Total Quantity
    Example: {"all_count":0,"lost_count":0,"returned_count":0,"returned_percent":0}

  - `data.client_stats.total.all_count` (integer)
    Total

  - `data.client_stats.total.lost_count` (integer)
    Lost Clients

  - `data.client_stats.total.returned_count` (integer)
    Returning clients

  - `data.client_stats.total.returned_percent` (number)
    Percentage of returning customers

  - `data.visits_stats_by_day` (array)
    Number of clients per day
    Example: [{"date":"2026-09-21","new_count":0,"old_count":0},{"date":"2026-09-21","new_count":0,"old_count":0}]

  - `data.visits_stats_by_day.date` (string)
    date

  - `data.visits_stats_by_day.new_count` (integer)
    Number of new clients

  - `data.visits_stats_by_day.old_count` (integer)
    Number of old clients

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


