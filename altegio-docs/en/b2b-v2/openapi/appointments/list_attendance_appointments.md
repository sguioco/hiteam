# List Attendance Appointments

Retrieve Appointments grouped under one attendance identifier as JSON:API
resource objects.

Use record_{appointment_id} to retrieve the group containing one
Appointment, or visit_{visit_id} to retrieve all Appointments linked to
one visit. The attendance_id path parameter and both prefixes are literal
wire values.

Related data can be requested by repeating the include parameter. Wire
values remain literal API keys: client identifies Booking User data,
staff identifies Team Member data, and goods identifies Products.
Custom Field Value includes require the corresponding Business User
permissions.

Endpoint: GET /locations/{location_id}/attendances/{attendance_id}/appointments
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

  - `attendance_id` (string, required)
    Attendance group identifier. Use the literal record_ prefix with an
Appointment ID or the literal visit_ prefix with a visit ID.
    Example: "record_12345"

## Query parameters:

  - `include` (array)
    Related resources to include; values are literal API keys
    Enum: "client", "client.custom_field_values", "staff", "services", "goods", "resource_instances", "labels", "attendance_service_items", "attendance_good_items", "attendance_document", "transactions", "fast_payment_settings", "acceptance_free", "custom_field_values", "comer", "client_notification_settings", "client_schedule", "duration_details"

## Response 200 fields (application/json):

  - `data` (array, required)

  - `data.type` (string, required)
    Literal JSON:API resource type

  - `data.id` (string, required)
    Appointment ID

  - `data.attributes` (object, required)

  - `data.attributes.company_id` (integer, required)
    Location ID

  - `data.attributes.external_id` (string, required)
    External Appointment ID

  - `data.attributes.visit_id` (integer, required)
    Linked visit ID, or 0 when not linked

  - `data.attributes.booking_user_id` (integer, required)
    Booking User account ID, or 0

  - `data.attributes.bookform_id` (integer, required)
    Booking form ID, or 0

  - `data.attributes.master_id` (integer, required)
    Deprecated wire field for Team Member ID; use staff_id

  - `data.attributes.staff_id` (integer, required)
    Team Member ID

  - `data.attributes.client_id` (integer, required)
    Booking User profile ID, or 0 when absent

  - `data.attributes.comer_id` (integer,null, required)
    Walk-in visitor ID

  - `data.attributes.source` (integer, required)
    Appointment source wire value

  - `data.attributes.attendance` (integer, required)
    Deprecated attendance wire value; use attendance_status_slug
    Enum: -1, 0, 1, 2

  - `data.attributes.attendance_status` (integer, required)
    Deprecated attendance status; use attendance_status_slug
    Enum: same as `data.attributes.attendance` (4 values)

  - `data.attributes.attendance_status_slug` (string, required)
    Appointment attendance status
    Enum: "absent", "waiting", "attended", "confirmed"

  - `data.attributes.client_fictive_name` (string,null, required)
    Fallback Booking User name stored on the Appointment

  - `data.attributes.client_fictive_phone` (string,null, required)
    Fallback Booking User phone stored on the Appointment

  - `data.attributes.client_fictive_email` (string,null, required)
    Fallback Booking User email stored on the Appointment

  - `data.attributes.clients_count` (integer, required)
    Number of Booking Users in the Appointment

  - `data.attributes.activity_id` (integer, required)
    Event ID, or 0 when the Appointment is not part of an Event

  - `data.attributes.custom_color` (string, required)
    Appointment background color without #, or an empty string

  - `data.attributes.custom_font_color` (string, required)
    Appointment text color without #, or an empty string

  - `data.attributes.length` (integer, required)
    Deprecated duration in seconds; use duration

  - `data.attributes.duration` (integer, required)
    Appointment duration in seconds

  - `data.attributes.paid_full` (integer, required)
    Deprecated payment wire value; use is_paid and is_overpaid
    Enum: 0, 1, 2

  - `data.attributes.is_paid` (boolean, required)
    Whether the Appointment is fully paid

  - `data.attributes.is_overpaid` (boolean, required)
    Whether the Appointment is overpaid

  - `data.attributes.timestamp` (integer, required)
    Appointment start as a Unix timestamp

  - `data.attributes.date` (string, required)
    Appointment start in the Location timezone, without an offset

  - `data.attributes.created_datetime` (string, required)
    Creation date and time in the Location timezone, without an offset

  - `data.attributes.from_url` (string, required)
    Source URL, or an empty string

  - `data.attributes.is_mobile` (integer, required)
    Mobile-origin wire status

  - `data.attributes.comment` (string, required)
    Appointment comment

  - `data.attributes.prepaid_status` (integer, required)
    Prepayment status wire value

  - `data.attributes.record_from` (string, required)
    Human-readable Appointment source, or an empty string

  - `data.attributes.payment_status` (integer,null, required)
    Membership auto-payment status, when available

  - `data.attributes.is_sale_bill_printed` (boolean,null, required)
    Whether the sale bill is printed, when available

  - `data.attributes.is_client_notification_sent` (boolean, required)
    Whether a Booking User notification was sent

  - `data.relationships` (object)
    Present when related data is requested through include

  - `data.relationships.client` (object)

  - `data.relationships.client.data` (any, required)
    - `type` (string, required)
    - `id` (string, required)

  - `data.relationships.staff` (object)

  - `data.relationships.services` (object)

  - `data.relationships.services.data` (array, required)

  - `data.relationships.services.data.type` (string, required)

  - `data.relationships.services.data.id` (string, required)

  - `data.relationships.goods` (object)

  - `data.relationships.resource_instances` (object)

  - `data.relationships.labels` (object)

  - `data.relationships.attendance_service_items` (object)

  - `data.relationships.attendance_good_items` (object)

  - `data.relationships.attendance_document` (object)

  - `data.relationships.transactions` (object)

  - `data.relationships.fast_payment_settings` (object)

  - `data.relationships.acceptance_free` (object)

  - `data.relationships.custom_field_values` (object)

  - `data.relationships.comer` (object)

  - `data.relationships.client_notification_settings` (object)

  - `data.relationships.client_schedule` (object)

  - `data.relationships.duration_details` (object)

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


