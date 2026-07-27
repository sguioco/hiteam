# Get a List of Chain Loyalty Transactions

Endpoint: GET /chain/{chain_id}/loyalty/transactions
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `created_after` (string, required)
    Sample start date in Y-m-d format

  - `created_before` (string, required)
    Sample end date in Y-m-d format

  - `types` (array)
    Types of loyalty transactions included in the selection: 1 - Promotion discount, 2 - Loyalty program accrual, 3 - Loyalty card withdrawal, 4 - Referral program accrual, 5 - Manual replenishment, 6 - Manual withdrawal, 7 - Overdue points withdrawal , 8 - Withdrawal from the gift card, 9 - Use of the membership, 10 - Recalculation of the cost of the membership, 11 - Withdrawal from the client account
    Enum: "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"

  - `company_ids` (array)
    Loyalty transaction affiliate IDs included in the sample

  - `visit_ids` (array)
    Loyalty transaction visit IDs included in the sample

  - `page` (integer)
    Selection page

  - `count` (integer)
    Number of results per selection page

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)

  - `data` (array)
    Array of objects with data

  - `data.id` (number)
    Transaction ID

  - `data.visit_id` (number)
    Visit ID

  - `data.status_id` (number)
    Transaction status ID

  - `data.amount` (number)
    Loyalty payment amount

  - `data.type_id` (number)
    Type of loyalty transaction

  - `data.card_id` (number)
    Loyalty card ID

  - `data.program_id` (number)
    Loyalty program ID

  - `data.certificate_id` (number)
    Loyalty certificate ID

  - `data.abonement_id` (number)
    Loyalty membership ID

  - `data.salon_group_id` (number)
    ID of the location chain, within the loyalty of which this transaction was created

  - `data.item_id` (number)
    Position ID in the order, if the transaction is related to the sale of a product or service

  - `data.item_type_id` (number)
    Item type in the order to which this transaction relates (1 Provision of service, 7 Sale of products), if applicable

  - `data.item_record_id` (number)
    ID of the appointment to which the item in the order belongs, if applicable

  - `data.goods_transaction_id` (number)
    Item sale transaction ID

  - `data.services_transaction_id` (number)
    Service Transaction ID

  - `data.is_discount` (boolean)

  - `data.is_loyalty_withdraw` (boolean)

  - `data.type` (object)

  - `data.type.id` (integer)

  - `data.type.title` (string)

  - `meta` (object)
    Metadata (contains the number of items in the response)

  - `meta.count` (integer)


## Response 422 fields
