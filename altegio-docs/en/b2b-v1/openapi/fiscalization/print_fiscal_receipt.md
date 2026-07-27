# Print fiscal receipt

Types of all transactions with location account

| Meaning | Description |
| ------------- | ------------- |
| 0 | Sale operation (active for documents with types "Visit" and "Client account replenishment") |
| 1 | Sale return operation (active for documents with types "Visit" and "Client account replenishment") |
| 2 | Correction operation |
| 4 | Shift opening operation – Opens a new POS shift |
| 5 | Shift closing operation – Closes the current POS shift |
| 9 | Get POS status – Retrieves the current status of the POS device |
| 11 | Get POS team status – Retrieves the status of all POS devices connected to the team |
| 12 | Correction operation |
| 13 | Print X-report – Prints a non-fiscal summary report of the current shift |
| 6 | Cash deposit – Registers a cash-in transaction in the POS |
| 7 | Cash withdrawal – Registers a cash-out transaction in the POS |

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
| 9 | Client account replenishment |

Endpoint: POST /kkm_transactions/{location_id}/print_document_bill
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `location_id` (number, required)
    Location ID

## Request fields (*/*):

  - `document_id` (number, required)
    Document ID

  - `type` (number, required)
    type of operation with location account (see table of types of all operations)

  - `is_pos_enabled` (boolean)
    enable POS terminal (default false)

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Array of objects with data
    Example: {"kkm_type":0,"kkm_transactions":[{"id":1954,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":0,"sum":0,"type":{"id":0,"title":"Sale operation"},"status":{"id":2,"title":"Sent for printing"},"document":{"id":164,"type":9,"type_title":"Deposit replenishment"},"cashier":{"id":1138453,"name":"Jack Smith"}}],"status":2,"bill_json":[{}]}

  - `data.kkm_type` (integer)
    Type of KKM operation

  - `data.kkm_transactions` (array)
    Example: [{"id":1954,"print_date":"2026-09-21T23:00:00.000-05:00","printed_count":0,"sum":0,"type":{"id":0,"title":"Sale operation"},"status":{"id":2,"title":"Sent for printing"},"document":{"id":164,"type":9,"type_title":"Deposit replenishment"},"cashier":{"id":1138453,"name":"Jack Smith"}}]

  - `data.kkm_transactions.id` (integer)
    Transaction ID

  - `data.kkm_transactions.print_date` (string)
    Check printing date

  - `data.kkm_transactions.printed_count` (number)
    Number of checks printed

  - `data.kkm_transactions.sum` (integer)
    Sum

  - `data.kkm_transactions.type` (object)
    Type of transaction

  - `data.kkm_transactions.type.id` (integer)
    Operation type identifier

  - `data.kkm_transactions.type.title` (string)
    Operation name

  - `data.kkm_transactions.status` (object)
    Receipt printing status

  - `data.kkm_transactions.status.id` (integer)
    Status ID

  - `data.kkm_transactions.status.title` (string)
    Status name

  - `data.kkm_transactions.document` (object)
    Transaction document

  - `data.kkm_transactions.document.id` (integer)
    Document ID

  - `data.kkm_transactions.document.type` (integer)
    Document type identifier

  - `data.kkm_transactions.document.type_title` (string)
    The name of the entity to which the document belongs

  - `data.kkm_transactions.cashier` (object)
    Cashier

  - `data.kkm_transactions.cashier.id` (integer)
    team member ID

  - `data.kkm_transactions.cashier.name` (string)
    team member name

  - `data.status` (integer)
    Example: 2

  - `data.bill_json` (array)
    Example: [{}]

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


