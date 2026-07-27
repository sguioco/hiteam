# Appointment Event

Sent when an appointment is created, updated, or deleted. The data field matches the response from GET /record/{company_id}/{record_id}.

Endpoint: POST RecordEvent
Version: 1.0.0

## Request fields (application/json):

  - `company_id` (integer, required)
    Location ID where the event occurred.

  - `resource` (string, required)
    Resource type.
    Enum: "record"

  - `resource_id` (integer, required)
    ID of the resource that was created, updated, or deleted.

  - `status` (string, required)
    Type of change that occurred.
    Enum: "create", "update", "delete"

  - `data` (object, required)
    Appointment data sent in webhook notifications. Contains comprehensive appointment details including services, team member, client, and financial information.

  - `data.id` (integer)
    Appointment ID.

  - `data.company_id` (integer)

  - `data.staff_id` (integer)

  - `data.clients_count` (integer)

  - `data.date` (string)

  - `data.datetime` (string)

  - `data.create_date` (string)

  - `data.last_change_date` (string)

  - `data.comment` (string)

  - `data.online` (boolean)

  - `data.visit_id` (integer)

  - `data.visit_attendance` (integer)

  - `data.attendance` (integer)

  - `data.confirmed` (integer)
    Enum: 0, 1

  - `data.seance_length` (integer)
    Duration in seconds.

  - `data.length` (integer)

  - `data.sms_before` (integer)
    Enum: same as `data.confirmed` (2 values)

  - `data.sms_now` (boolean)

  - `data.sms_now_text` (string)

  - `data.email_now` (integer)
    Enum: same as `data.confirmed` (2 values)

  - `data.notified` (string)

  - `data.master_request` (string)

  - `data.api_id` (string)

  - `data.from_url` (string)

  - `data.review_requested` (integer)
    Enum: same as `data.confirmed` (2 values)

  - `data.created_user_id` (integer)

  - `data.deleted` (boolean)

  - `data.paid_full` (boolean)

  - `data.prepaid` (boolean)

  - `data.prepaid_confirmed` (boolean)

  - `data.is_update_blocked` (boolean)

  - `data.activity_id` (integer)

  - `data.bookform_id` (integer)

  - `data.record_from` (string)

  - `data.is_mobile` (boolean)

  - `data.services` (array)
    Booked services.

  - `data.services.id` (integer)

  - `data.services.title` (string)

  - `data.services.cost` (number)

  - `data.services.cost_to_pay` (number)

  - `data.services.manual_cost` (number)

  - `data.services.cost_per_unit` (number)

  - `data.services.discount` (number)

  - `data.services.first_cost` (number)

  - `data.services.amount` (integer)

  - `data.staff` (object,null)
    Assigned team member.

  - `data.staff.id` (integer)

  - `data.staff.api_id` (string)

  - `data.staff.name` (string)

  - `data.staff.specialization` (string)

  - `data.staff.position` (object)

  - `data.staff.avatar` (string)

  - `data.staff.avatar_big` (string)

  - `data.staff.rating` (number)

  - `data.staff.votes_count` (integer)

  - `data.client` (object,null)
    Client details.

  - `data.client.id` (integer)

  - `data.client.name` (string)

  - `data.client.surname` (string)

  - `data.client.patronymic` (string)

  - `data.client.display_name` (string)

  - `data.client.phone` (string)

  - `data.client.email` (string)

  - `data.client.card` (string)

  - `data.client.comment` (string)

  - `data.client.discount` (number)

  - `data.client.sex` (string)

  - `data.client.birthday` (string)

  - `data.client.success_visits_count` (integer)

  - `data.client.fail_visits_count` (integer)

  - `data.client.custom_fields` (array)

  - `data.client.client_tags` (array)

  - `data.goods_transactions` (array)
    Product operations linked to this appointment.

  - `data.custom_fields` (array)

  - `data.custom_color` (string)
    Hex color code.

  - `data.custom_font_color` (string)

  - `data.record_labels` (array)

  - `data.record_labels.id` (integer)

  - `data.record_labels.title` (string)

  - `data.record_labels.color` (string)

  - `data.record_labels.icon` (string)

  - `data.record_labels.font_color` (string)

  - `data.documents` (array)

  - `data.short_link` (string)

  - `data.sms_remain_hours` (integer,null)

  - `data.email_remain_hours` (integer,null)

  - `data.comer` (object,null)

  - `data.comer_person_info` (object,null)

  - `data.composite` (object,array)
    Composite appointment data if applicable.


## Response 200 fields
