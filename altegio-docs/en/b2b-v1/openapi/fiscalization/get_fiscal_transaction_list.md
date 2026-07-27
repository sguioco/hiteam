# Get fiscal transactions

Filters

| Parameter | Description |
| ------------- | ------------- |
| page | Page number |
| editable_length | Number of clients per page |
| type | Operation type |
| status | Operation status |
| start_date | Period start date |
| end_date | Period end date |


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
| 9 | Deposit replenishment |

Endpoint: GET /kkm_transactions/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer access_token, User user_token

## Path parameters:

  - `location_id` (number, required)
    location ID

## Query parameters:

  - `page` (number)
    Page number
    Example: 1

  - `editable_length` (number)
    Number of customers per page
    Example: 25

  - `type` (number)
    Type of transaction
    Example: 20

  - `status` (number)
    Operation status
    Example: 6

  - `start_date` (number)
    Period start date
    Example: 20251201

  - `end_date` (number)
    Period end date
    Example: 20251231

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":1059,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":1,"sum":10,"type":{"id":1,"title":"Sales return operation"},"status":{"id":3,"title":"Runtime error"},"document":{"id":2045,"type":7,"type_title":"Visit"},"cashier":{"id":746310,"name":"Jack Smith"}}]

  - `data.id` (integer)
    Transaction ID

  - `data.print_date` (string)
    Check printing date

  - `data.printed_count` (number)
    Number of checks printed

  - `data.sum` (integer)
    Sum

  - `data.type` (object)
    Type of transaction

  - `data.type.id` (integer)
    Operation type identifier

  - `data.type.title` (string)
    Operation name

  - `data.status` (object)
    Receipt printing status

  - `data.status.id` (integer)
    Status ID

  - `data.status.title` (string)
    Status name

  - `data.document` (object)
    Transaction document

  - `data.document.id` (integer)
    Document ID

  - `data.document.type` (integer)
    Document type identifier

  - `data.document.type_title` (string)
    The name of the entity to which the document belongs

  - `data.cashier` (object)
    Cashier

  - `data.cashier.id` (integer)
    team member ID

  - `data.cashier.name` (string)
    team member name

  - `meta` (object)
    Metadata (contains the number of transactions found)
    Example: {"count":1}

  - `meta.count` (integer)
    Example: 1

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


