# Change Event Notification Settings

Endpoint: POST /hooks_settings/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `active` (number, required)
    1 - notifications are active, 0 - not active

  - `urls` (array, required)
    List of addresses to send notifications to
    Example: ["https://dev.tools.test.com/test/Hooks"]

  - `salon` (number)
    1 - send events by location entity, 0 - do not send
    Example: 1

  - `service_category` (number)
    1 - send events by service category entity, 0 - do not send

  - `service` (number)
    1 - send events by service entity, 0 - do not send
    Example: 1

  - `good` (number)
    1 - send events by product entity, 0 - don't send
    Example: 1

  - `master` (number)
    1 - send events by team member entity, 0 - don't send
    Example: 1

  - `client` (number)
    1 - send events by client entity, 0 - don't send
    Example: 1

  - `record` (number)
    1 - send events by appointment entity, 0 - do not send
    Example: 1

  - `goods_operations_sale` (number)
    1 - send events by the product sale entity, 0 - do not send
    Example: 1

  - `goods_operations_receipt` (number)
    1 - send events by the entity arrival of products, 0 - do not send
    Example: 1

  - `goods_operations_consumable` (number)
    1 - send events by the consumable write-off entity, 0 - do not send
    Example: 1

  - `goods_operations_stolen` (number)
    1 - send events by the product write-off entity, 0 - do not send
    Example: 1

  - `goods_operations_move` (number)
    1 - send events by the product movement entity, 0 - no send
    Example: 1

  - `finances_operation` (number)
    1 - send events by entity financial operation, 0 - no send
    Example: 1

  - `self_sending` (number)
    1 - The webhook creator will receive events triggered by their own actions, 0 - The webhook creator will not receive events triggered by their own actions

## Response 201 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"urls":["https://dev.tools.test.com/test/Hooks"],"active":0,"salon":1,"service_category":0,"service":1,"good":1,"master":1,"client":1,"record":1,"goods_operations_sale":1,"goods_operations_receipt":1,"goods_operations_consumable":1,"goods_operations_stolen":1,"goods_operations_move":1,"finances_operation":1}

  - `data.urls` (array)
    List of addresses to send notifications to
    Example: ["https://dev.tools.test.com/test/Hooks"]

  - `data.active` (integer)
    1 - notifications are active, 0 - not active

  - `data.salon` (integer)
    1 - send events by location entity, 0 - do not send
    Example: 1

  - `data.service_category` (integer)
    1 - send events by service category entity, 0 - do not send

  - `data.service` (integer)
    1 - send events by service entity, 0 - do not send
    Example: 1

  - `data.good` (integer)
    1 - send events by product entity, 0 - don't send
    Example: 1

  - `data.master` (integer)
    1 - send events by team member entity, 0 - don't send
    Example: 1

  - `data.client` (integer)
    1 - send events by client entity, 0 - don't send
    Example: 1

  - `data.record` (integer)
    1 - send events by appointment entity, 0 - do not send
    Example: 1

  - `data.goods_operations_sale` (integer)
    1 - send events by the product sale entity, 0 - do not send
    Example: 1

  - `data.goods_operations_receipt` (integer)
    1 - send events by the entity arrival of products, 0 - do not send
    Example: 1

  - `data.goods_operations_consumable` (integer)
    1 - send events by the consumable write-off entity, 0 - do not send
    Example: 1

  - `data.goods_operations_stolen` (integer)
    1 - send events by the product write-off entity, 0 - do not send
    Example: 1

  - `data.goods_operations_move` (integer)
    1 - send events by the product movement entity, 0 - no send
    Example: 1

  - `data.finances_operation` (integer)
    1 - send events by entity financial operation, 0 - no send
    Example: 1

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


