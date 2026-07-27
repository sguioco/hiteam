# Deposits

Client deposit accounts and operations

## Get a List of Client Accounts by Location and Client

 - [GET /deposits/company/{location_id}/client/{client_id}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_client_account_list_by_location_and_client.md)

## Get a list of client accounts by chain and a set of filters

 - [GET /deposits/chain/{chain_id}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_client_account_list_by_chain.md)

## Get a list of client accounts by chain and customer phone number

 - [GET /deposits/chain/{chain_id}/phone/{phone}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_client_account_by_chain_and_phone.md)

## Create a client account topup operation

 - [POST /deposits_operations/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/deposits/create_client_account_topup_operation.md): Creating a transaction with a client account involves creating a document, a transaction with a client account, and a financial transaction within a single API request.

## Get client account transaction history

 - [GET /chain/{chain_id}/deposits/{deposit_id}/history](https://developer.alteg.io/en/b2b-v1/openapi/deposits/get_chain_client_account_history.md): Retrieves the transaction history for a specific client account in the chain.

Returns a list of all transactions (top-ups, withdrawals, etc.) made on the client account.

Note: Requires chain-level permissions.

