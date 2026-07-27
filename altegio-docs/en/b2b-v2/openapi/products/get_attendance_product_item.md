# Get Appointment Product Item

Retrieve a Product item associated with an Appointment as a JSON:API
resource object.

The positive response shape is verified against the current PHP transformer
but has not been live-verified because the test Location has no safe fixture.

Endpoint: GET /locations/{location_id}/attendance_product_items/{attendance_product_item_id}
Version: 2.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Authorization` (string, required)
    Bearer {partner_token}, User {user_token}

## Path parameters:

  - `location_id` (integer, required)
    Location ID

  - `attendance_product_item_id` (integer, required)
    Appointment Product Item ID

## Query parameters:

  - `include` (array)
    Related resources to include. Wire values are literal API keys;
staff represents the Team Member and good represents the Product.
    Enum: "good", "staff", "storage_amount", "loyalty_abonement", "loyalty_certificate", "marks"

## Response 200 fields (application/json):

  - `data` (object, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Appointment Product Item ID

  - `data.attributes` (object, required)

  - `data.attributes.record_id` (integer, required)
    Appointment ID; record_id is the literal wire field

  - `data.attributes.quantity` (number, required)
    Product quantity

  - `data.attributes.unit_id` (integer, required)
    Operation Unit ID

  - `data.attributes.sale_unit_id` (integer, required)
    Sale Unit ID

  - `data.attributes.consumable_unit_id` (integer, required)
    Consumable Unit ID

  - `data.attributes.operation_type_slug` (string,null, required)
    Unit operation type

  - `data.attributes.first_cost` (number, required)
    Product cost before Appointment item adjustments

  - `data.attributes.manual_cost` (number, required)
    Manually specified Product cost

  - `data.attributes.cost_per_unit` (number, required)
    Product cost per unit

  - `data.attributes.discount_percent` (number, required)
    Applied discount percentage

  - `data.attributes.cost` (number, required)
    Final Product cost

  - `data.attributes.staff_id` (integer, required)
    Team Member ID

  - `data.attributes.good_id` (integer, required)
    Product ID

  - `data.attributes.storage_id` (integer, required)
    Storage ID

  - `data.attributes.operation_unit_type` (string,null, required)
    Deprecated wire field; use operation_type_slug

  - `data.attributes.master_id` (integer, required)
    Deprecated Team Member ID wire alias; use staff_id

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.good` (object)

  - `data.relationships.good.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `data.relationships.staff` (object)

  - `data.relationships.storage_amount` (object)

  - `data.relationships.loyalty_abonement` (object)

  - `data.relationships.loyalty_certificate` (object)

  - `data.relationships.marks` (object)

  - `data.relationships.marks.data` (array, required)

  - `data.relationships.marks.data.type` (string, required)

  - `data.relationships.marks.data.id` (string, required)

  - `meta` (array, required)

  - `included` (array)
    Resources requested through include, when available

  - `included.type` (string, required)

  - `included.id` (string, required)

  - `included.attributes` (object, required)

  - `included.relationships` (object)

## Response 401 fields (application/json):

  - `success` (boolean, required)

  - `data` (null, required)

  - `meta` (object, required)

  - `meta.message` (string, required)

  - `meta.errors` (object)
    Field-level validation errors, when applicable


