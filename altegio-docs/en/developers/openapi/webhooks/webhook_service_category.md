# Service Category Event

Sent when a service category is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/service/categories.

Endpoint: POST ServiceCategoryEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "service_category"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Service category data sent in webhook notifications.

  - `data.id` (integer)
    Service category ID.

  - `data.salon_service_id` (integer)

  - `data.title` (string)

  - `data.weight` (integer)
    Sort order.

  - `data.api_id` (string)

  - `data.staff` (array)
    Team member IDs assigned to this category.

  - `data.is_chain` (boolean)


## Response 200 fields
