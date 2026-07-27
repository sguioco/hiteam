# Client Event

Sent when a client is created, updated, or deleted. The data field contains the full client profile with all default includes.

Endpoint: POST ClientEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "client"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Client data sent in webhook notifications. Uses the full client profile with all default includes (email, card, birth_date, comment, discount, visits, sex, sms preferences, money, importance, categories, custom_fields).

  - `data.id` (integer)
    Client ID.

  - `data.name` (string)
    First name.

  - `data.surname` (string)

  - `data.patronymic` (string)

  - `data.display_name` (string)
    Formatted full name.

  - `data.phone` (string)
    Phone number (visible — webhook always has full access).

  - `data.email` (string)

  - `data.card` (string)
    Loyalty card number.

  - `data.birth_date` (string)
    Birthday in YYYY-MM-DD format.

  - `data.comment` (string)
    Client card comment.

  - `data.discount` (number)
    Personal discount percentage.

  - `data.visits` (integer)
    Total visit count.

  - `data.sex_id` (integer)
    0 — unknown, 1 — male, 2 — female.
    Enum: 0, 1, 2

  - `data.sex` (string)

  - `data.sms_check` (integer)
    Enum: 0, 1

  - `data.sms_bot` (integer)
    Enum: same as `data.sms_check` (2 values)

  - `data.sms_not` (integer)
    Enum: same as `data.sms_check` (2 values)

  - `data.spent` (number)
    Total amount spent.

  - `data.paid` (number)
    Total amount paid.

  - `data.balance` (number)
    Current balance.

  - `data.importance_id` (integer)
    0 — normal, 1 — VIP, 2 — blacklisted.

  - `data.importance` (string)

  - `data.categories` (array)
    Client category labels.

  - `data.categories.id` (integer)

  - `data.categories.title` (string)

  - `data.categories.color` (string)

  - `data.last_change_date` (string)

  - `data.custom_fields` (array)
    Custom field values configured for this location.


## Response 200 fields
