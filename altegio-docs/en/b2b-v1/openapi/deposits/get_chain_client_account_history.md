# Get client account transaction history

Retrieves the transaction history for a specific client account in the chain.

Returns a list of all transactions (top-ups, withdrawals, etc.) made on the client account.

Note: Requires chain-level permissions.

Endpoint: GET /chain/{chain_id}/deposits/{deposit_id}/history
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `chain_id` (integer, required)
    Chain ID
    Example: 706028

  - `deposit_id` (integer, required)
    Client account ID
    Example: 12345

## Response 200 fields (application/json):

  - `success` (boolean)
    Example: true

  - `data` (array)

  - `data.deposit_transaction` (object)
    Client account transaction details

  - `data.deposit_transaction.id` (integer)
    Transaction ID
    Example: 1

  - `data.deposit_transaction.salon_id` (integer)
    Location ID where transaction occurred
    Example: 720441

  - `data.deposit_transaction.salon_group_id` (integer)
    Chain ID
    Example: 706028

  - `data.deposit_transaction.user_id` (integer)
    User ID associated with the client account
    Example: 123456

  - `data.deposit_transaction.amount` (number)
    Transaction amount (positive for top-up, negative for withdrawal)
    Example: 100.5

  - `data.deposit_transaction.balance_after` (number)
    Personal account balance after this transaction
    Example: 12239.56

  - `data.deposit_transaction.reserved_balance_after` (number)
    Personal account reserved balance after this transaction

  - `data.deposit_transaction.date_create` (string)
    Transaction creation date and time
    Example: "2026-01-15T14:30:00.000000Z"

  - `data.deposit_transaction.comment` (string)
    Transaction comment
    Example: "Top-up payment"

  - `data.deposit_transaction.deleted` (boolean)
    Whether transaction has been deleted

  - `data.deposit_transaction_type` (object)
    Transaction type information

  - `data.deposit_transaction_type.id` (integer)
    Transaction type ID
    Example: 1

  - `data.deposit_transaction_type.comment` (string)
    Transaction type name
    Example: "Top-up"

  - `meta` (array)
    Example: []

## Response 401 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 403 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 404 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

## Response 422 fields (application/json):

  - `success` (boolean)

  - `data` (null)

  - `meta` (object)

  - `meta.message` (string)


