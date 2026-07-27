# Payments

Payment processing, accounts, and KKM transactions

## Get document financial transactions

 - [GET /storage_operations/documents/finance_transactions/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_document_financial_transactions.md)

## Get location accounts

 - [GET /accounts/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_account_list.md): The location account object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Location account ID |
| title | string | Title |
| type | number | 1 - for non-cash payments, 0 for cash |
| comment | string | Description to the location account |

## Get transactions

 - [GET /transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_transactions.md): #### Transaction filtering

+ page: Page number

+ count: Number of customers per page

+ account_id: Checkout ID

+ supplier_id: Supplier ID

+ client_id: Client ID

+ user_id: user ID

+ master_id: team member ID

+ type: transaction type

+ real_money: Indicates whether this is a real-money (fiat) transaction

+ deleted: whether the transaction was deleted

+ start_date: start date of the period

+ end_date: end date of the period

+ balance_is: 0 - any balance, 1 - positive, 2 - negative

+ document_id: document ID

## Get Transactions by Visit or Appointment ID

 - [GET /timetable/transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_transactions_by_visit_or_appointment_id.md): #### Transaction filtering

+ record_id: Appointment ID

+ visit_id: ID of the visit

## Create a Financial Transaction

 - [POST /finance_transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/create_financial_transaction.md)

## Getting a financial transaction

 - [GET /finance_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/get_financial_transaction.md)

## Financial Transaction Update

 - [PUT /finance_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/update_financial_transaction.md)

## Deleting a transaction

 - [DELETE /finance_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/payments/delete_financial_transaction.md)

