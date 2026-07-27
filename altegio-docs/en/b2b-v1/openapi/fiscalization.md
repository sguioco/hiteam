# Fiscalization

Tax system integration and KKM callbacks

## Get fiscal transactions

 - [GET /kkm_transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/get_fiscal_transaction_list.md): Filters

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

## Print fiscal receipt

 - [POST /kkm_transactions/{location_id}/print_document_bill](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/print_fiscal_receipt.md): Types of all transactions with location account

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

## List request example

 - [GET /integration/kkm/references/tax_system/{country_id}](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/get_tax_system_list.md): A list of tax systems and VAT available for a country can be obtained by requesting the country ID for which the list is to be obtained.
The country ID can be obtained from list of countries.

The list is an array of tax systems with a nested VAT array for each tax system.

The taxation system has the following structure:

| Field | Type | Description |
| -----------------| ---------------- | ----------------------- |
| title | string | Name of taxation system |
| slug | string | Code name for the taxation system |
| vats | Array of objects(Vat[]) | List of available VAT for the taxation system |


VAT has the following structure:

| Field | Type | Description |
| -----------------| ---------------- | ----------------------- |
| title | string | Title VAT |
| slug | string | Code name VAT |

## Example of a request in case of successful fiscalization or in case of an error

 - [POST /integration/kkm/callback](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/handle_fiscalization_callback.md)

## Example of a request for fiscalization of a document

 - [POST /https://your-api.url](https://developer.alteg.io/en/b2b-v1/openapi/fiscalization/fiscalize_document.md)

