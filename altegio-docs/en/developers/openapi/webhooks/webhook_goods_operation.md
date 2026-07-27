# Product Operation Event

Sent when a product operation occurs: sale, receipt, consumable write-off, product write-off, or product movement.
The resource field indicates the specific operation type: goods_operations_sale, goods_operations_receipt, goods_operations_consumable, goods_operations_stolen, goods_operations_move.

Endpoint: POST GoodsOperationEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "goods_operations_sale", "goods_operations_receipt", "goods_operations_consumable", "goods_operations_stolen", "goods_operations_move"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Product operation data sent in webhook notifications. Covers all operation types: sale, receipt, consumable write-off, product write-off, and movement.

  - `data.id` (integer)
    Transaction ID.

  - `data.document_id` (integer)

  - `data.type_id` (integer)
    Transaction type: 1 — sale, 2 — write-off, etc.

  - `data.type` (string)

  - `data.operation_unit_type` (string)

  - `data.amount` (number)

  - `data.create_date` (string)

  - `data.cost_per_unit` (number)

  - `data.cost` (number)

  - `data.discount` (number)

  - `data.comment` (string)

  - `data.record_id` (integer)

  - `data.last_change_date` (string)

  - `data.loyalty_abonement_id` (integer,null)

  - `data.loyalty_certificate_id` (integer,null)

  - `data.good` (object)
    Related product.

  - `data.good.id` (integer)

  - `data.good.title` (string)

  - `data.unit` (object)

  - `data.unit.id` (integer)

  - `data.unit.title` (string)

  - `data.unit.short_title` (string)

  - `data.storage` (object)

  - `data.storage.id` (integer)

  - `data.storage.title` (string)

  - `data.client` (object)

  - `data.client.id` (integer)

  - `data.client.name` (string)

  - `data.client.phone` (string)

  - `data.master` (object)

  - `data.master.id` (integer)

  - `data.master.title` (string)

  - `data.service` (object)

  - `data.service.id` (integer)

  - `data.service.title` (string)

  - `data.supplier` (object)

  - `data.supplier.id` (integer)

  - `data.supplier.title` (string)


## Response 200 fields
