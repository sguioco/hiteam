# Sales

Sales transactions and document management

## Receipt of a Sales Transaction

 - [GET /company/{location_id}/sale/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/sales/get_sale_transaction.md)

## Payment at the Location Account and Loyalty (Various Methods)

 - [POST /company/{location_id}/sale/{document_id}/payment](https://developer.alteg.io/en/b2b-v1/openapi/sales/create_payment_with_loyalty_methods.md): As a response, information about the Sale operation is returned

## Delete a Loyalty Payment Transaction

 - [DELETE /company/{location_id}/sale/{document_id}/payment/loyalty_transaction/{payment_transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/sales/delete_loyalty_payment_transaction.md): As a response, information about the Sale operation is returned

## Delete a Cashier Payment Transaction

 - [DELETE /company/{location_id}/sale/{document_id}/payment/payment_transaction/{payment_transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/sales/delete_location_account_payment.md): As a response, information about the Sale operation is returned

