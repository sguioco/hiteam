# Update Consumables for the Appointment-Service Association

Endpoint: PUT /technological_cards/record_consumables/consumables/{location_id}/{record_id}/{service_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

  - `record_id` (number, required)
    Appointment ID

  - `service_id` (number, required)
    Service ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `consumables` (array)
    List of consumables

  - `consumables.amount` (number, required)
    the number of consumables in the appointment

  - `consumables.good_id` (number, required)
    product id

  - `consumables.goods_transaction_id` (number, required)
    commodity transaction id

  - `consumables.price` (number, required)
    the cost of the consumable in the appointment

  - `consumables.record_id` (number, required)
    appointment id

  - `consumables.service_id` (number, required)
    service id

  - `consumables.storage_id` (number, required)
    inventory id

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"service_id":21558,"record_id":1233243,"technological_cards":[{"id":36069,"title":"Tech map","technological_card_items":[{"id":208568,"technological_card_id":36069,"storage_id":91303,"good_id":6858783,"amount":10,"price":1000,"good":{"id":6858783,"title":"Product","unit":"G"}}]}],"consumables":[{"goods_transaction_id":2180771,"record_id":121793129,"service_id":695486,"storage_id":91303,"good_id":6858783,"price":1000,"amount":10,"good":{"id":6858783,"title":"Product","unit":"G"}}]}]

  - `data.service_id` (number)
    Service ID

  - `data.record_id` (number)
    Appointment ID

  - `data.technological_cards` (array)
    Technological cards

  - `data.technological_cards.id` (number)
    ID of those cards

  - `data.technological_cards.title` (string)
    The name of those cards

  - `data.technological_cards.technological_card_items` (array)
    Those consumables cards

  - `data.technological_cards.technological_card_items.id` (number)
    Consumable ID

  - `data.technological_cards.technological_card_items.technological_card_id` (number)
    Dash ID

  - `data.technological_cards.technological_card_items.storage_id` (number)
    Inventory ID

  - `data.technological_cards.technological_card_items.good_id` (number)
    Item ID

  - `data.technological_cards.technological_card_items.amount` (number)
    Quantity

  - `data.technological_cards.technological_card_items.price` (number)
    Price

  - `data.technological_cards.technological_card_items.good` (object)
    Product

  - `data.technological_cards.technological_card_items.good.id` (number)
    Item ID

  - `data.technological_cards.technological_card_items.good.title` (string)
    Product Name

  - `data.technological_cards.technological_card_items.good.unit` (string)
    unit of measurement

  - `data.consumables` (array)

  - `data.consumables.goods_transaction_id` (number)
    Commodity transaction ID

  - `data.consumables.record_id` (number)
    Appointment ID

  - `data.consumables.service_id` (number)
    Service ID

  - `data.consumables.storage_id` (number)
    Inventory ID

  - `data.consumables.good_id` (number)
    Item ID

  - `data.consumables.price` (number)
    Price

  - `data.consumables.amount` (number)
    Quantity

  - `data.consumables.good` (object)
    Product

  - `data.consumables.good.id` (number)
    Item ID

  - `data.consumables.good.title` (string)
    Product Name

  - `data.consumables.good.unit` (string)
    unit of measurement

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


