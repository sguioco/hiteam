# Edit Appointment

Fully updates an Appointment. This is not a partial update: for a standard Appointment,
resend staff_id, services, client, datetime, and seance_length, including when
only custom_fields needs to change. A missing required field returns 422.

For a Group Event Appointment, send activity_id and client. The activity_id must
match the Appointment's current Group Event. The API obtains staff_id, services,
datetime, and seance_length from that Group Event.

### Updating only custom fields

1. Get the current Appointment.
2. Copy the required main fields into this request without changing them.
3. Add the new values to custom_fields, using each configured field code as a key.

The Business User must have both custom_fields_record_values_read_access and
custom_fields_record_values_edit_access. Without both permissions, custom Appointment
Field values are not updated.

### Editing restrictions

The request can be rejected when the Appointment is waiting for online payment, lies
outside the Business User's allowed editing period, is fully paid, or has an arrived
client and the Business User lacks the corresponding edit permission.

If is_sale_bill_printed is true, keep the resent date, time, client, attendance status,
Team Member, and Services unchanged when updating only custom fields. Changes covered by
the printed receipt can require reversing the receipt first.

Endpoint: PUT /record/{location_id}/{record_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `record_id` (number, required)
    Appointment ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `include_consumables` (number)

  - `include_finance_transactions` (number)

## Request fields (application/json):

  - `activity_id` (integer)
    Group Event ID. Required for a Group Event Appointment; omit it or use 0 for a standard Appointment. When updating, the value must match the current Appointment.

  - `staff_id` (number)
    team member ID
    Example: 8886

  - `services` (array)
    Service parameters (id, cost, discount)
    Example: [{"id":331,"first_cost":9000,"discount":50,"cost":4500},{"id":333,"first_cost":2000,"discount":10,"cost":1800}]

  - `services.id` (number)
    Service ID

  - `services.first_cost` (number)
    Initial cost of the service

  - `services.discount` (number)
    Service discount

  - `services.cost` (number)
    The total cost of the service

  - `client` (object)
    Client parameters (phone, name, email)
    Example: {"phone":"+13155550175","name":"James Smith","email":"j.smith@example.com"}

  - `client.phone` (string)
    Customer phone number
    Example: "+13155550175"

  - `client.name` (string)
    Client name
    Example: "James Smith"

  - `client.email` (string)
    Client Email
    Example: "j.smith@example.com"

  - `save_if_busy` (boolean)
    Whether to keep the appointment if the time is busy or non-working, or give an error

  - `datetime` (string)
    Date and time of appointment
    Example: "2026-09-21T23:00:00.000-05:00"

  - `seance_length` (number)
    Appointment duration in seconds. Includes technical_break_duration. To add a technical break without reducing the service time, increase seance_length by the break delta.
    Example: 3600

  - `send_sms` (boolean)
    Whether to send SMS with the details of the appointment to the client
    Example: true

  - `comment` (string)
    Appointment Comment
    Example: "test appointment!"

  - `sms_remain_hours` (number)
    Specifies how many hours before the visit an SMS reminder should be sent to the client. Set to 0 if no reminder is needed.
    Example: 6

  - `email_remain_hours` (number)
    Specifies how many hours before the visit an email reminder should be sent to the client. Set to 0 if no reminder is needed.
    Example: 24

  - `attendance` (number)
    Appointment status (2 - User confirmed the appointment, 1 - User came, services provided, 0 - user waiting, -1 - user did not show)
    Example: 1

  - `api_id` (string)
    External system ID
    Example: "777"

  - `custom_color` (string)
    Appointment color
    Example: "f44336"

  - `record_labels` (array)
    Array of post category IDs
    Example: ["67345","104474"]

  - `technical_break_duration` (any)
    Technical break duration in seconds.
- Must be in multiples of 300 (5-minute intervals)
- Maximum value is 3600 (1 hour)
- If null or not provided, uses location default from Settings → Appointment Log → Technical Breaks

  - `custom_fields` (object)
    Custom Appointment Field values keyed by field code.

The Business User must have both custom_fields_record_values_read_access and
custom_fields_record_values_edit_access. When updating an Appointment, supplying
custom_fields does not make the request partial: resend the required main fields
for the applicable Appointment type.
    Example: {"my_custom_field":123,"some_another_field":["first value","second value"]}

  - `custom_fields.my_custom_field` (integer)
    Example: 123

  - `custom_fields.some_another_field` (array)
    Example: ["first value","second value"]

## Response 201 fields (application/json):

  - `success` (boolean)
    Success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":999,"services":[{"id":331,"first_cost":9000,"discount":50,"cost":4500},{"id":333,"first_cost":2000,"discount":10,"cost":1800}],"client":{"phone":"+13155550175","name":"James Smith","email":"j.smith@example.com"},"clients_count":1,"staff":{"id":8886,"name":"Alice Smith","spec":"stylist"},"datetime":"2026-09-21T23:00:00.000-05:00","seance_length":3600,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"test appointment!","visit_attendance":1,"confirmed":1,"sms_before":6,"sms_now":1,"sms_now_text":"","email_now":1,"notified":0,"master_request":1,"api_id":"","from_url":"","review_requested":0,"activity_id":0,"documents":[{"id":8172893,"type_id":7,"storage_id":0,"user_id":746310,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}]}

  - `data.id` (integer)
    Example: 999

  - `data.services` (array)
    Example: [{"id":331,"first_cost":9000,"discount":50,"cost":4500},{"id":333,"first_cost":2000,"discount":10,"cost":1800}]

  - `data.services.id` (number)
    Service ID

  - `data.services.first_cost` (number)
    Initial cost of the service (excluding discounts)

  - `data.services.discount` (number)
    Discount

  - `data.services.cost` (number)
    The total cost of the service

  - `data.client` (object)
    Example: {"phone":"+13155550175","name":"James Smith","email":"j.smith@example.com"}

  - `data.client.phone` (string)
    Customer phone
    Example: "+13155550175"

  - `data.client.name` (string)
    Client name
    Example: "James Smith"

  - `data.client.email` (string)
    Client Email
    Example: "j.smith@example.com"

  - `data.clients_count` (number)
    Number of occupied places in a group appointment
    Example: 1

  - `data.staff` (object)
    Example: {"id":8886,"name":"Alice Smith","spec":"stylist"}

  - `data.staff.id` (number)
    team member ID
    Example: 8886

  - `data.staff.name` (string)
    team member name
    Example: "Alice Smith"

  - `data.staff.spec` (string)
    team member specialization
    Example: "stylist"

  - `data.datetime` (string)
    Session date
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.seance_length` (number)
    Appointment duration in seconds. Includes technical_break_duration. Equal to the sum of services plus the technical break.
    Example: 3600

  - `data.create_date` (string)
    date of creation
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.comment` (string)
    Appointment Comment
    Example: "test appointment!"

  - `data.confirmed` (number)
    Is the appointment verified?
    Example: 1

  - `data.sms_before` (number)
    Whether to send an SMS reminder to the client (if the client is specified)
    Example: 6

  - `data.sms_now` (number)
    Did you send SMS when adding an appointment
    Example: 1

  - `data.sms_now_text` (string)
    SMS text

  - `data.email_now` (number)
    Has an email notification been sent?
    Example: 1

  - `data.notified` (number)
    Flag for confirmation of the appointment by the location administrator, if the client asked to confirm the appointment

  - `data.master_request` (number)
    Indicates whether a specific team member was selected for the appointment. Set to false if the "any team member" option was chosen
    Example: 1

  - `data.api_id` (string)
    External appointment ID

  - `data.from_url` (string)
    From which page the transition was made to complete the appointment (website, VK application, etc.)

  - `data.review_requested` (number)
    Flag for requesting visit feedback from the client

  - `data.activity_id` (number)
    Group  event ID

  - `data.documents` (array)
    Example: [{"id":8172893,"type_id":7,"storage_id":0,"user_id":746310,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}]

  - `data.documents.id` (number)
    Document ID

  - `data.documents.type_id` (number)
    Document type

  - `data.documents.storage_id` (number)
    Inventory ID

  - `data.documents.user_id` (number)
    ID of the user who created the document

  - `data.documents.company_id` (number)
    location ID

  - `data.documents.number` (number)
    Document Number

  - `data.documents.comment` (string)
    Document comment

  - `data.documents.date_created` (string)
    Document creation date

  - `data.documents.category_id` (integer)
    Product category ID

  - `data.documents.visit_id` (integer)
    Visit ID

  - `data.documents.record_id` (integer)
    Appointment ID

  - `data.documents.type_title` (string)
    The name of the entity to which the document belongs

  - `meta` (array)
    Metadata (empty array)
    Example: []

## Response 400 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "An error has occurred."

  - `meta.errors` (array)
    Set of a validation error messages.

## Response 401 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Authentication needed."

## Response 403 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Access denied."

## Response 404 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object,array)
    Additional response data (empty object or empty array)

## Response 422 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.


