# Loyalty Card Event

Sent when a loyalty card is created, updated, or deleted. Uses a simplified payload with essential fields only.

Endpoint: POST LoyaltyCardEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "loyalty_card"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Loyalty card data sent in webhook notifications. Uses a simplified transformer with essential fields only.

  - `data.id` (integer, required)
    Loyalty card ID.

  - `data.balance` (number, required)
    Current card balance.

  - `data.number` (string, required)
    Card number.

  - `data.phone` (string, required)
    Phone number linked to the card.


## Response 200 fields
