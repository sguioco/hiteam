# Retrieve a list of bill of materials and consumables

Endpoint: GET /technological_cards/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `search` (string)
    parameter for searching by the name of those lists
    Example: "'test'"

  - `page` (number)
    page number
    Example: 1

  - `count` (number)
    number of those lists per page
    Example: 20

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of data objects
    Example: [{"id":1,"title":"Tech map 1","technological_card_items":[{"id":3,"technological_card_id":1,"storage_id":4234,"good_id":34234,"amount":12,"unit":"l","price":0.0742,"title":"Consumable 3"}]},{"id":2,"title":"Tech map 2","technological_card_items":[{"id":4,"technological_card_id":2,"storage_id":4234,"good_id":34235,"amount":10,"unit":"l","price":0.02412,"title":"Consumable 4"}]}]

  - `data.id` (integer)
    Tech ID. cards

  - `data.title` (string)
    The name of those cards

  - `data.technological_card_items` (array)
    List of consumables kart

  - `data.technological_card_items.id` (number)
    Consumable ID

  - `data.technological_card_items.technological_card_id` (number)
    Tech ID. cards

  - `data.technological_card_items.storage_id` (number)
    Inventory ID

  - `data.technological_card_items.good_id` (number)
    Item ID

  - `data.technological_card_items.amount` (number)
    Quantity

  - `data.technological_card_items.unit` (string)
    unit of measurement

  - `data.technological_card_items.price` (number)
    Price

  - `data.technological_card_items.title` (string)
    Name

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


