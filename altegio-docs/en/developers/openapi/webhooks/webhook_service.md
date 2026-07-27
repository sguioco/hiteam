# Service Event

Sent when a service is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/services/{service_id}.

Endpoint: POST ServiceEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "service"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Service data sent in webhook notifications. Matches the output of the service detail API.

  - `data.id` (integer)
    Service ID.

  - `data.salon_service_id` (integer)

  - `data.title` (string)

  - `data.booking_title` (string)
    Title shown in online booking.

  - `data.category_id` (integer)

  - `data.price_min` (number)

  - `data.price_max` (number)

  - `data.duration` (integer)
    Duration in minutes.

  - `data.discount` (number)

  - `data.comment` (string)

  - `data.weight` (integer)
    Sort order.

  - `data.active` (integer)
    Enum: 0, 1

  - `data.api_id` (string)

  - `data.staff` (array)
    Assigned team members.

  - `data.staff.id` (integer)

  - `data.staff.seance_length` (integer)

  - `data.image_group` (object)

  - `data.prepaid` (string)

  - `data.is_multi` (boolean)

  - `data.capacity` (integer)

  - `data.is_price_managed_only_in_chain` (boolean)

  - `data.is_comment_managed_only_in_chain` (boolean)


## Response 200 fields
