# Financial Operation Event

Sent when a financial transaction is created, updated, or deleted. May optionally include payment_system_transaction_ids if the feature is enabled for the location.

Endpoint: POST FinancesOperationEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "finances_operation"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Financial transaction data sent in webhook notifications. Includes default relations (expense, master, supplier, account, client) and webhook-specific includes (record, client.email). May optionally include payment_system_transaction_ids if the feature is enabled for the location.

  - `data.id` (integer)
    Transaction ID.

  - `data.document_id` (integer)

  - `data.date` (string,null)

  - `data.amount` (number)

  - `data.comment` (string)

  - `data.last_change_date` (string,null)

  - `data.record_id` (integer)

  - `data.visit_id` (integer)

  - `data.sold_item_id` (integer)

  - `data.sold_item_type` (string)

  - `data.expense` (object)
    Expense category.

  - `data.expense.id` (integer)

  - `data.expense.title` (string)

  - `data.master` (object)
    Team member.

  - `data.supplier` (object)
    Supplier.

  - `data.account` (object)
    Payment account.

  - `data.client` (object)
    Client with email included.

  - `data.client.id` (integer)

  - `data.client.name` (string)

  - `data.client.surname` (string)

  - `data.client.patronymic` (string)

  - `data.client.phone` (string)

  - `data.client.email` (string)

  - `data.record` (object)
    Linked appointment (compact).

  - `data.payment_system_transaction_ids` (array)
    Payment system transaction IDs (optional, feature-flagged).


## Response 200 fields
