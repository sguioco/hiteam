# Cancel the Application of the Discount Promotion in the Visit

Cancellation of the promotion applied to the visit.

Endpoint: POST /visit/loyalty/cancel_discount_program/{location_id}/{card_id}/{program_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Location ID

  - `card_id` (number, required)
    Client card ID

  - `program_id` (number, required)
    ID of the promotion linked to the card

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (*/*):

  - `record_id` (number, required)
    Appointment ID

  - `visit_id` (number, required)
    Visit ID

## Response 200 fields (application/json):

  - `payment_transactions` (array)
    Array with information about the financial transactions of the appointment
    Example: []

  - `loyalty_transactions` (array)
    An array with information about applied loyalty transactions in a visit
    Example: []

  - `kkm_transaction_details_container` (object)
    An object that holds details about transactions recorded by the POS system
    Example: {"last_operation_type":1,"transactions":[]}

  - `kkm_transaction_details_container.last_operation_type` (integer)
    Example: 1

  - `kkm_transaction_details_container.transactions` (array)
    Example: []

  - `items` (array)
    Array with information about products and services of the appointment
    Example: [{"id":96063258,"item_id":5048384,"item_type_id":7,"record_id":0,"item_title":"test two","amount":1,"first_cost":20,"manual_cost":20,"discount":0,"cost":20,"master_id":548096,"good_id":5048384,"service_id":0,"event_id":0,"is_service":false,"is_event":false,"is_good":true},{"id":0,"item_id":2560779,"item_type_id":1,"record_id":140878948,"item_title":"Deep bikini","amount":1,"first_cost":3000,"manual_cost":3000,"discount":0,"cost":3000,"master_id":140878948,"good_id":0,"service_id":2560779,"event_id":0,"is_service":true,"is_event":false,"is_good":false}]

  - `items.id` (integer)
    Object ID

  - `items.item_id` (integer)
    Product/service identifier

  - `items.item_type_id` (integer)
    Operation type identifier

  - `items.record_id` (integer)
    Appointment ID

  - `items.item_title` (string)
    Product/service name

  - `items.amount` (integer)
    Number of products/services

  - `items.first_cost` (number)
    Initial cost

  - `items.manual_cost` (number)
    Cost changed manually

  - `items.discount` (number)
    Discount

  - `items.cost` (number)
    the total cost

  - `items.master_id` (integer)
    team member ID

  - `items.good_id` (integer)
    Item ID

  - `items.service_id` (integer)
    Service ID

  - `items.event_id` (integer)
    Promotion ID

  - `items.is_service` (boolean)
    Is a service

  - `items.is_event` (boolean)
    Is a stock

  - `items.is_good` (boolean)
    Is the commodity

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


