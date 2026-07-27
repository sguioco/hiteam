# Get Visit Details

Block "kkm_transaction_details_container"

Flag "last_operation_type"

| Meaning | Description |
| ------------- | ------------- |
| 0 | Print return receipt |
| 1 | Print sales receipt |

Types of all transactions with location account

| Meaning | Description |
| ------------- | ------------- |
| 0 |  Sales operation – Active for documents of type Visit |
| 1 | Sale return operation – Active for documents of type Visit |
| 2 | Correction operation |
| 4 | Shift opening operation – Opens a new POS shift |
| 5 | Shift closing operation – Closes the current POS shift |
| 9 | Get POS status – Retrieves the current status of the POS device |
| 11 | Get POS team status – Retrieves the status of all POS devices connected to the team |
| 12 | Correction operation |
| 13 | Print X-report – Prints a non-fiscal summary report of the current shift |
| 6 | Cash deposit – Registers a cash-in transaction in the POS |
| 7 | Cash withdrawal – Registers a cash-out transaction in the POS |

Statuses of All POS Operations

| Meaning | Description |
| ------------- | ------------- |
| 0 |  Connection error with POS – Unable to establish a connection with the POS device |
| 1 |  Success – Operation completed successfully |
| 2 | Sent for printing – The request has been sent to the POS and is waiting for print completion |
| 3 | Runtime error – An error occurred while processing the operation on the POS device |
| 4 | Status check error – Failed to retrieve the current status of the POS |
| 5 | Waiting for POS readiness – Operation is pending until the POS device becomes ready |

Document Types

| Meaning | Description |
| ------------- | ------------- |
| 1 | Sale of products |
| 2 | Provision of services |
| 3 | Arrival of products |
| 4 | Products write-off |
| 5 | Transfer of products |
| 6 | Inventory |
| 7 | Visit |
| 8 | Consumables write-off |

Endpoint: GET /visit/details/{location_id}/{record_id}/{visit_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    Example: 12345

  - `record_id` (number, required)
    Example: 67890

  - `visit_id` (number, required)
    Example: 11111

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer access_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"payment_transactions":[{"id":6023813,"document_id":8172806,"date":"2026-09-21T23:00:00.000-05:00","type_id":5,"expense_id":5,"account_id":32299,"amount":10,"client_id":4241492,"master_id":0,"supplier_id":0,"comment":"","item_id":1162679,"target_type_id":1,"record_id":13136569,"goods_transaction_id":0,"expense":{"id":5,"title":"Provision of services"},"account":{"id":32299,"title":"Deposits (payment in cash)"},"client":{"id":4241492,"name":"ModulKassaClient","phone":"+13155550175"},"master":[],"supplier":[]}],"loyalty_transactions":[{"id":10614,"status_id":1,"amount":0.5,"type_id":2,"program_id":145,"card_id":20013,"salon_group_id":646,"item_id":0,"item_type_id":0,"item_record_id":0,"goods_transaction_id":0,"is_discount":false,"is_loyalty_withdraw":false,"type":{"id":2,"title":"Loyalty programs"}}],"kkm_transaction_details_container":{"last_operation_type":0,"transactions":[{"id":1047,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":1,"sum":13,"type":{"id":0,"title":"Sale operation"},"status":{"id":1,"title":"Successfully"},"document":{"id":2045,"type":7,"type_title":"Visit"},"cashier":{"id":746310,"name":"Jack Smith"}}]},"items":[{"id":0,"item_id":1162679,"item_type_id":1,"record_id":13136569,"item_title":"Haircut with the TOP-expert","amount":2,"first_cost":20,"manual_cost":10,"discount":50,"cost":10,"master_id":13136569,"good_id":0,"service_id":1162679,"event_id":0,"is_service":true,"is_event":false,"is_good":false}]}

  - `data.payment_transactions` (array)
    Payment transactions
    Example: [{"id":6023813,"document_id":8172806,"date":"2026-09-21T23:00:00.000-05:00","type_id":5,"expense_id":5,"account_id":32299,"amount":10,"client_id":4241492,"master_id":0,"supplier_id":0,"comment":"","item_id":1162679,"target_type_id":1,"record_id":13136569,"goods_transaction_id":0,"expense":{"id":5,"title":"Provision of services"},"account":{"id":32299,"title":"Deposits (payment in cash)"},"client":{"id":4241492,"name":"ModulKassaClient","phone":"+13155550175"},"master":[],"supplier":[]}]

  - `data.payment_transactions.id` (number)
    Payment transaction ID

  - `data.payment_transactions.document_id` (number)
    Document ID

  - `data.payment_transactions.date` (string)
    Transaction date

  - `data.payment_transactions.type_id` (number)
    Transaction type

  - `data.payment_transactions.expense_id` (number)
    Payment Item ID

  - `data.payment_transactions.account_id` (number)
    Checkout ID

  - `data.payment_transactions.amount` (number)
    Payment amount

  - `data.payment_transactions.client_id` (number)
    Client ID

  - `data.payment_transactions.master_id` (number)
    team member ID

  - `data.payment_transactions.supplier_id` (number)
    Vendor ID

  - `data.payment_transactions.comment` (string)
    A comment

  - `data.payment_transactions.item_id` (number)
    Item ID

  - `data.payment_transactions.target_type_id` (integer)

  - `data.payment_transactions.record_id` (number)
    Appointment ID

  - `data.payment_transactions.goods_transaction_id` (number)
    Commodity transaction ID

  - `data.payment_transactions.expense` (object)
    Payment item

  - `data.payment_transactions.expense.id` (integer)
    Payment Item ID

  - `data.payment_transactions.expense.title` (string)
    Name of payment item

  - `data.payment_transactions.account` (object)
    Location account

  - `data.payment_transactions.account.id` (number)
    Checkout ID

  - `data.payment_transactions.account.title` (string)
    Location account name

  - `data.payment_transactions.client` (object)
    Customer

  - `data.payment_transactions.client.id` (integer)
    Client ID

  - `data.payment_transactions.client.name` (string)
    Client name

  - `data.payment_transactions.client.phone` (string)
    Phone number

  - `data.payment_transactions.master` (array)
    team member

  - `data.payment_transactions.supplier` (array)
    The supplier

  - `data.loyalty_transactions` (array)
    Loyalty transactions
    Example: [{"id":10614,"status_id":1,"amount":0.5,"type_id":2,"program_id":145,"card_id":20013,"salon_group_id":646,"item_id":0,"item_type_id":0,"item_record_id":0,"goods_transaction_id":0,"is_discount":false,"is_loyalty_withdraw":false,"type":{"id":2,"title":"Loyalty programs"}}]

  - `data.loyalty_transactions.id` (number)
    Transaction ID

  - `data.loyalty_transactions.status_id` (number)
    Transaction status ID

  - `data.loyalty_transactions.amount` (number)
    Loyalty payment amount

  - `data.loyalty_transactions.type_id` (number)
    Type of loyalty transaction

  - `data.loyalty_transactions.program_id` (number)
    Loyalty program ID

  - `data.loyalty_transactions.card_id` (number)
    Loyalty card ID

  - `data.loyalty_transactions.salon_group_id` (number)
    ID of the location chain, within the loyalty of which this transaction was created

  - `data.loyalty_transactions.item_id` (number)
    Position ID in the order, if the transaction is related to the sale of a product or service

  - `data.loyalty_transactions.item_type_id` (number)
    Item type in the order to which this transaction relates (1 Provision of service, 7 Sale of products), if applicable

  - `data.loyalty_transactions.item_record_id` (number)
    ID of the appointment to which the item in the order belongs, if applicable

  - `data.loyalty_transactions.goods_transaction_id` (number)
    Item sale transaction ID

  - `data.loyalty_transactions.is_discount` (boolean)

  - `data.loyalty_transactions.is_loyalty_withdraw` (boolean)

  - `data.loyalty_transactions.type` (object)

  - `data.loyalty_transactions.type.id` (integer)

  - `data.loyalty_transactions.type.title` (string)

  - `data.kkm_transaction_details_container` (object)
    KKM transaction details
    Example: {"last_operation_type":0,"transactions":[{"id":1047,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":1,"sum":13,"type":{"id":0,"title":"Sale operation"},"status":{"id":1,"title":"Successfully"},"document":{"id":2045,"type":7,"type_title":"Visit"},"cashier":{"id":746310,"name":"Jack Smith"}}]}

  - `data.kkm_transaction_details_container.last_operation_type` (number)
    Type of last KKM operation

  - `data.kkm_transaction_details_container.transactions` (array)
    KKM transaction
    Example: [{"id":1047,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":1,"sum":13,"type":{"id":0,"title":"Sale operation"},"status":{"id":1,"title":"Successfully"},"document":{"id":2045,"type":7,"type_title":"Visit"},"cashier":{"id":746310,"name":"Jack Smith"}}]

  - `data.kkm_transaction_details_container.transactions.id` (number)
    Transaction ID

  - `data.kkm_transaction_details_container.transactions.print_date` (string)
    Check printing date

  - `data.kkm_transaction_details_container.transactions.printed_count` (integer)

  - `data.kkm_transaction_details_container.transactions.sum` (number)
    Payment amount with an accuracy of 2 decimal places

  - `data.kkm_transaction_details_container.transactions.type` (object)
    Payment type

  - `data.kkm_transaction_details_container.transactions.type.id` (number)
    Payment type ID

  - `data.kkm_transaction_details_container.transactions.type.title` (string)
    Payment type name

  - `data.kkm_transaction_details_container.transactions.status` (object)
    Receipt printing status

  - `data.kkm_transaction_details_container.transactions.status.id` (number)
    Status ID

  - `data.kkm_transaction_details_container.transactions.status.title` (string)
    Status name

  - `data.kkm_transaction_details_container.transactions.document` (object)
    document

  - `data.kkm_transaction_details_container.transactions.document.id` (number)
    Document ID

  - `data.kkm_transaction_details_container.transactions.document.type` (number)
    Document type identifier

  - `data.kkm_transaction_details_container.transactions.document.type_title` (string)
    Document entity name

  - `data.kkm_transaction_details_container.transactions.cashier` (object)
    Cashier

  - `data.kkm_transaction_details_container.transactions.cashier.id` (number)
    team member ID

  - `data.kkm_transaction_details_container.transactions.cashier.name` (string)
    team member name

  - `data.items` (array)
    Array of products/services
    Example: [{"id":0,"item_id":1162679,"item_type_id":1,"record_id":13136569,"item_title":"Haircut with the TOP-expert","amount":2,"first_cost":20,"manual_cost":10,"discount":50,"cost":10,"master_id":13136569,"good_id":0,"service_id":1162679,"event_id":0,"is_service":true,"is_event":false,"is_good":false}]

  - `data.items.id` (number)
    Array entity ID

  - `data.items.item_id` (number)
    Product or service identifier

  - `data.items.item_type_id` (integer)

  - `data.items.record_id` (number)
    Appointment ID

  - `data.items.item_title` (string)
    Name of the product or service

  - `data.items.amount` (number)
    Quantity

  - `data.items.first_cost` (number)
    Initial cost

  - `data.items.manual_cost` (number)
    Manual price

  - `data.items.discount` (number)
    Discount

  - `data.items.cost` (number)
    Final price minus all discounts and promotions

  - `data.items.master_id` (number)
    team member ID

  - `data.items.good_id` (number)
    Item ID

  - `data.items.service_id` (number)
    Service ID

  - `data.items.event_id` (number)
    Promotion ID

  - `data.items.is_service` (boolean)
    This is a service

  - `data.items.is_event` (boolean)
    This is a promotion

  - `data.items.is_good` (boolean)
    This is a product

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


