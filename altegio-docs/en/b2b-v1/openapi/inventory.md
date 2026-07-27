# Inventory

Stock management, storage operations, and tech cards

## Get location inventories

 - [GET /storages/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_location_inventories.md): The location inventory object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| id | number | Inventory ID |
| title | string | Title |
| for_services | number | 1 - if used for automatic write-off of consumables |
| for_sale | number | 1 - if the default inventory for selling products |
| comment | string | Description of the inventory |

## Search for product transactions

 - [GET /storages/transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/search_for_product_transactions.md)

## Create an inventory operation

 - [POST /storage_operations/operation/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/create_inventory_operation.md): An inventory operation is created by submitting a document along with multiple product transactions in a single API request. If a payment type is specified, the corresponding financial transactions will be generated automatically.

## Create document

 - [POST /storage_operations/documents/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/create_document.md)

## Get document

 - [GET /storage_operations/documents/{location_id}/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_document.md)

## Update Document

 - [PUT /storage_operations/documents/{location_id}/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/update_document.md)

## Delete document

 - [DELETE /storage_operations/documents/{location_id}/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/delete_document.md)

## Create Transaction

 - [POST /storage_operations/goods_transactions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/create_transaction.md)

## Get a transaction

 - [GET /storage_operations/goods_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_transaction.md)

## Transaction update

 - [PUT /storage_operations/goods_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/update_transaction.md)

## Deleting a transaction

 - [DELETE /storage_operations/goods_transactions/{location_id}/{transaction_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/delete_transaction.md)

## Get Product Transactions of a Document

 - [GET /storage_operations/documents/goods_transactions/{document_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_document_product_transactions.md)

## Retrieve a list of bill of materials and consumables

 - [GET /technological_cards/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_bill_of_materials_list.md)

## Get the Bill of Materials for a Team Member’s Service

 - [GET /technological_cards/default_for_staff_and_service/{location_id}/{team_member_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_team_member_service_bill_of_materials.md)

## Retrieve a list of bill of materials and consumables

 - [GET /technological_cards/record_consumables/{location_id}/{record_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/get_appointment_consumables.md)

## Update Consumables for the Appointment-Service Association

 - [PUT /technological_cards/record_consumables/consumables/{location_id}/{record_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/update_appointment_service_consumables.md)

## Unlink Appointment-Service Association

 - [DELETE /technological_cards/record_consumables/technological_cards/{location_id}/{record_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/inventory/unlink_appointment_service_association.md)

