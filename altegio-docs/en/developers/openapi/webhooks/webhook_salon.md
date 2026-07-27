# Location Event

Sent when a location is created, updated, or deleted.

Endpoint: POST SalonEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "salon"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Location data sent in webhook notifications. Corresponds to the output of the location detail API. Contains comprehensive location information.

  - `data.id` (integer)
    Location ID.

  - `data.title` (string)
    Location name.

  - `data.public_title` (string)
    Public display name.

  - `data.phone` (string)
    Primary phone number.

  - `data.phones` (array)
    All phone numbers.

  - `data.country_id` (integer)

  - `data.country` (string)

  - `data.city_id` (integer)

  - `data.city` (string)

  - `data.active` (integer)
    1 — active, 0 — inactive.
    Enum: 0, 1

  - `data.timezone` (string)
    Timezone offset (e.g. "+3").

  - `data.timezone_name` (string)
    IANA timezone name.

  - `data.address` (string)

  - `data.coordinate_lat` (number)

  - `data.coordinate_lon` (number)

  - `data.currency_short_title` (string)
    Currency code (e.g. "USD").

  - `data.business_group_id` (integer)

  - `data.business_type_id` (integer)

  - `data.site` (string)
    Website URL.

  - `data.zip` (string)

  - `data.logo` (string)
    Logo URL.

  - `data.short_descr` (string)
    Short description.

  - `data.description` (string)
    Full description (HTML).

  - `data.schedule` (object)
    Working hours schedule.

  - `data.email` (string)

  - `data.social` (object)
    Social media links.

  - `data.social.facebook` (string)

  - `data.social.instagram` (string)

  - `data.social.telegram` (string)

  - `data.social.whatsapp` (string)

  - `data.social.viber` (string)

  - `data.social.vk` (string)

  - `data.main_group_id` (integer)

  - `data.main_group` (object,null)

  - `data.main_group.id` (integer)

  - `data.main_group.title` (string)

  - `data.record_type_id` (integer)

  - `data.booking_comment_required` (boolean)

  - `data.booking_email_required` (boolean)


## Response 200 fields
