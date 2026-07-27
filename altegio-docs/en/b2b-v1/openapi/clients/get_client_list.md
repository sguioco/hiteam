# Get a list of clients

Endpoint: POST /company/{location_id}/clients/search
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `page` (number)
    Page number
    Example: 1

  - `page_size` (number)
    The number of output lines per page. Maximum 200. (Default 25)
    Example: 3

  - `fields` (array)
    Fields to be returned in the response
    Example: ["id","name"]

  - `order_by` (string)
    What field to sort by
    Enum: "id", "name", "phone", "email", "discount", "first_visit_date", "last_visit_date", "sold_amount", "visit_count"

  - `order_by_direction` (string)
    How to sort (ascending / descending)
    Enum: "ASC", "DESC"

  - `operation` (string)
    Type of transaction
    Enum: "AND", "OR"

  - `filters` (array)
    Filters for searching by customers
    Example: [{"type":"id","state":{"value":[1,2,3]}},{"type":"sold_amount","state":{"from":0,"to":100.77}},{"type":"quick_search","state":{"value":"James Smith"}},{"type":"importance","state":{"value":[0,1,2,3]}},{"type":"has_mobile_app","state":{"value":true}},{"type":"category","state":{"value":[1,7]}},{"type":"has_passteam_card","state":{"value":true}},{"type":"passteam_card_ids","state":{"value":["111122223333aaaabbbbcccc"]}},{"type":"birthday","state":{"from":"1990-01-01 00:00:00","to":"2000-01-01 23:59:59"}},{"type":"gender","state":{"value":[0,1,2]}},{"type":"record","state":{"staff":{"value":[1,2]},"service":{"value":[2,3]},"service_category":{"value":[4,5]},"status":{"value":[1]},"created":{"from":"2026-01-01 00:00:00","to":"2026-01-01 23:59:59"},"records_count":{"from":1,"to":99999},"sold_amount":{"from":1.001,"to":99999.09}}},{"type":"client","state":{"id":{"value":[1,2,3]},"birthday":{"from":"1990-01-01 00:00:00","to":"2000-01-01 23:59:59"}}},{"type":"sale","state":{"abonement_balance":{"from":2,"to":3}}}]

  - `filters.type` (string)

  - `filters.state` (object)
    Filter type

  - `filters.state.value` (array)

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"name":"James Smith","id":2},{"name":"Taylor Reed","id":3},{"name":"James Smith","id":1}]

  - `data.name` (string)
    Client name

  - `data.id` (number)
    Client ID

  - `meta` (object)
    Metadata (contains the number of clients found)
    Example: {"total_count":908}

  - `meta.total_count` (integer)
    Example: 908

## Response 400 fields (application/json):

  - `success` (boolean)
    Execution success status (false)

  - `data` (string)
    Contains null

  - `meta` (object)
    Metadata (contains an error message)
    Example: {"message":"Invalid filter value","errors":{"filters":["Invalid filter state value"]}}

  - `meta.message` (string)
    Example: "Invalid filter value"

  - `meta.errors` (object)
    Example: {"filters":["Invalid filter state value"]}

  - `meta.errors.filters` (array)
    Example: ["Invalid filter state value"]

## Response 402 fields (application/json):

  - `success` (boolean)
    Execution success status (false)

  - `data` (string)
    Contains null

  - `meta` (object)
    Metadata (contains an error message)
    Example: {"message":"It is necessary to renew the license in the branch with id: {company_id}"}

  - `meta.message` (string)
    Example: "It is necessary to renew the license in the branch with id: {company_id}"

## Response 404 fields (application/json):

  - `success` (boolean)
    Execution success status (false)

  - `meta` (object)
    Metadata (contains an error message)
    Example: {"message":"Possible error messages","errors":[{"message":"Location not specified."},{"filters":["Invalid filter state value"]}]}

  - `meta.message` (string)
    Example: "Possible error messages"

  - `meta.errors` (array)
    Example: [{"message":"Location not specified."},{"filters":["Invalid filter state value"]}]

  - `meta.errors.message` (string)


