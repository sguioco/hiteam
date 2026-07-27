# Product Event

Sent when a product is created, updated, or deleted. The data field matches the response from GET /goods/{company_id}/{good_id}.

Endpoint: POST GoodEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "good"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Product data sent in webhook notifications. Matches the output of the product detail API.

  - `data.good_id` (integer)
    Product ID.

  - `data.title` (string)

  - `data.value` (string)
    Same as title.

  - `data.label` (string)
    Title with article in parentheses.

  - `data.article` (string)

  - `data.category` (string)

  - `data.category_id` (integer)

  - `data.salon_id` (integer)

  - `data.cost` (number)

  - `data.unit_id` (integer)

  - `data.unit_short_title` (string)

  - `data.service_unit_id` (integer)

  - `data.service_unit_short_title` (string)

  - `data.actual_cost` (number)

  - `data.unit_actual_cost` (number)

  - `data.unit_actual_cost_format` (string)
    Formatted price string.

  - `data.unit_equals` (number)

  - `data.barcode` (string)

  - `data.is_chain` (boolean)

  - `data.comment` (string)

  - `data.loyalty_abonement_type_id` (integer)

  - `data.loyalty_certificate_type_id` (integer)

  - `data.loyalty_certificate_type` (object,null)

  - `data.loyalty_allow_empty_code` (integer)
    Enum: 0, 1

  - `data.loyalty_serial_number_limited` (integer)
    Enum: same as `data.loyalty_allow_empty_code` (2 values)

  - `data.actual_amounts` (array)

  - `data.critical_amount` (number,null)

  - `data.desired_amount` (number)

  - `data.last_change_date` (string)

  - `data.is_goods_mark_enabled` (boolean)


## Response 200 fields
