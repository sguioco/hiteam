# Get list of appointments

####  Filtering Appointments

+ staff_id: team member ID. 

Use this to retrieve appointments for a specific team member

+ client_id: Client ID 

Use this to retrieve appointments for a specific client

+ created_user_id: User ID 

User who created the appointment 

Use this to filter appointments created by a specific user

+ start_date: Session start date (inclusive) 

Returns appointments with a session starting on or after this date

+ end_date: Session end date (inclusive) 

Returns appointments with a session ending on or before this date

+ c_start_date: Appointment creation date from 

Returns appointments created on or after this date

+ c_end_date: Appointment creation date until 

Returns appointments created on or before this date

+ changed_after: Modified or created after this datetime 

Returns appointments created or modified after the specified date and time

+ changed_before: Modified or created before this datetime 

Returns appointments created or modified before the specified date and time

Endpoint: GET /records/{location_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Query parameters:

  - `page` (number)
    Page number
    Example: 1

  - `count` (number)
    Number of appointments per page
    Example: 50

  - `team_member_id` (number)
    team member ID, if you only need appointments for a specific team member
    Example: 7572

  - `client_id` (number)
    Client ID. If you need appointments for a specific client
    Example: 572

  - `created_user_id` (number)
    The ID of the user who created the appointment. If you need appointments created by a specific user
    Example: 7572

  - `start_date` (string)
    Session date starting at (filter by session date). If you need appointments for a session starting from a specific date
    Example: "2026-01-21"

  - `end_date` (string)
    Session date to. If you need appointments for a session before a specific date
    Example: "2026-01-21"

  - `c_start_date` (string)
    Appointment creation date starting from(filter by appointment creation date). If you need appointments created since a specific date
    Example: "2026-01-21"

  - `c_end_date` (string)
    Appointment creation date by (filter by appointment creation date).
    Example: "2026-01-21"

  - `changed_after` (string)
    The date the appointment was modified/created. If you need appointments created/modified starting from a specific date and time
    Example: "2026-01-21T23:00:00"

  - `changed_before` (string)
    The date the appointment was modified/created. If you need appointments created/modified before a specific date and time
    Example: "2026-01-21T23:00:00"

  - `include_consumables` (number)
    Flag for including a list of consumables by appointments in the response

  - `include_finance_transactions` (number)
    Flag to include in the response financial transactions by appointments

  - `with_deleted` (boolean)
    Include deleted appointments in output (with_deleted=1 will return deleted appointments as well)

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":2,"company_id":4564,"staff_id":9,"services":[{"id":1,"title":"Hair extension","cost":100,"manual_cost":100,"cost_per_unit":100,"discount":0,"first_cost":100,"amount":1}],"goods_transactions":[],"staff":{"id":9,"name":"Alex Taylor","specialization":"hair extension","position":{"id":1,"title":"Administrator"},"avatar":"http://app.alteg.io/images/no-master-sm.png","avatar_big":"http://app.alteg.io/images/no-master.png","rating":0,"votes_count":0},"date":"2026-09-21T23:00:00.000-05:00","datetime":"2026-09-21T23:00:00.000-05:00","create_date":"2026-01-16T20:35:11-0500","comment":"do not write down","online":false,"visit_attendance":0,"attendance":0,"confirmed":1,"seance_length":3600,"length":3600,"sms_before":0,"sms_now":0,"sms_now_text":"","email_now":0,"notified":0,"master_request":0,"api_id":"","from_url":"","review_requested":0,"visit_id":8262996,"created_user_id":1073232,"deleted":false,"paid_full":0,"prepaid":false,"prepaid_confirmed":false,"last_change_date":"2026-01-16T20:35:15-0500","custom_color":"","custom_font_color":"","record_labels":[],"activity_id":0,"custom_fields":{},"documents":[{"id":8172893,"type_id":7,"storage_id":0,"user_id":746310,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}],"sms_remain_hours":5,"email_remain_hours":1,"bookform_id":0,"record_from":"","is_mobile":0,"is_sale_bill_printed":false,"consumables":[],"finance_transactions":[]},{"id":9,"company_id":4564,"staff_id":49,"services":[],"goods_transactions":[],"staff":{"id":49,"name":"Sam Carter","specialization":"stylist","position":{"id":1,"title":"Administrator"},"avatar":"http://app.alteg.io/images/no-master-sm.png","avatar_big":"http://app.alteg.io/images/no-master.png","rating":0,"votes_count":0},"date":"2026-09-21T23:00:00.000-05:00","datetime":"2026-09-21T23:00:00.000-05:00","create_date":"2026-01-16T20:35:11-0500","comment":"","online":true,"visit_attendance":1,"attendance":1,"confirmed":1,"seance_length":10800,"length":10800,"sms_before":0,"sms_now":0,"sms_now_text":"","email_now":0,"notified":0,"master_request":1,"api_id":"","from_url":"","review_requested":0,"visit_id":8262996,"created_user_id":1073232,"deleted":false,"paid_full":0,"prepaid":false,"prepaid_confirmed":false,"last_change_date":"2026-01-09T20:45:30-0500","custom_color":"f44336","custom_font_color":"#ffffff","record_labels":[{"id":67345,"title":"the team member is not important","color":"#009800","icon":"unlock","font_color":"#ffffff"},{"id":104474,"title":"important category","color":"#3b2c54","icon":"star","font_color":"#ffffff"}],"activity_id":0,"custom_fields":{},"documents":[{"id":8172893,"type_id":7,"storage_id":0,"user_id":746310,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}],"consumables":[],"finance_transactions":[]}]

  - `data.id` (number)
    Appointment ID

  - `data.company_id` (number)
    location ID

  - `data.staff_id` (number)
    team member ID

  - `data.services` (array)
    Array of objects with services in the appointment

  - `data.services.id` (number)
    Service ID

  - `data.services.title` (string)
    Service name

  - `data.services.cost` (number)
    The total cost of the service

  - `data.services.cost_to_pay` (number)
    Amount to pay (cost minus discounts/deposits)

  - `data.services.manual_cost` (number)
    Manual price

  - `data.services.cost_per_unit` (number)
    Unit cost

  - `data.services.discount` (number)
    Discount

  - `data.services.first_cost` (number)
    Initial cost of the service (excluding discounts)

  - `data.services.amount` (number)
    Quantity

  - `data.services.assistants` (array,null)
    Array of assistant team members for this service

  - `data.goods_transactions` (array)
    Array of commodity transactions

  - `data.staff` (object)
    team member data object

  - `data.staff.id` (number)
    team member ID

  - `data.staff.api_id` (string,null)
    team member External ID

  - `data.staff.name` (string)
    team member name

  - `data.staff.specialization` (string)
    team member specialization

  - `data.staff.position` (object)
    team member's position

  - `data.staff.position.id` (number)
    Job ID

  - `data.staff.position.title` (string)
    Job title

  - `data.staff.position.services_binding_type` (number)
    Services binding type

  - `data.staff.avatar` (string)
    The path to the file with the team member's avatar

  - `data.staff.avatar_big` (string)
    Let to the file with the team member's profile picture in high resolution

  - `data.staff.rating` (number)
    team member Rating

  - `data.staff.votes_count` (number)
    Number of votes that rated the team member

  - `data.client` (object,null)
    Customer data (may be empty)

  - `data.client.id` (number)
    Client ID

  - `data.client.name` (string)
    Client first name

  - `data.client.surname` (string)
    Client surname

  - `data.client.middle_name` (string)
    Client middle name

  - `data.client.patronymic` (string)
    Client middle name (legacy field name; same value as middle_name)

  - `data.client.display_name` (string)
    Client display name

  - `data.client.comment` (string)
    Client comment

  - `data.client.phone` (string)
    Client phone number

  - `data.client.card` (string)
    Client card number

  - `data.client.email` (string)
    Client email

  - `data.client.success_visits_count` (number)
    Number of successful visits

  - `data.client.fail_visits_count` (number)
    Number of failed visits

  - `data.client.discount` (number)
    Client discount

  - `data.client.is_new` (boolean)
    Is new client flag

  - `data.client.custom_fields` (array)
    Client custom fields

  - `data.client.gender` (number)
    Client gender (0 - not specified, 1 - male, 2 - female)

  - `data.client.sex` (number)
    Client sex (alias for gender: 0 - not specified, 1 - male, 2 - female)

  - `data.client.birthday` (string)
    Client birthday

  - `data.client.client_tags` (array)
    Client tags

  - `data.client.phone_country_id` (number)
    Phone country ID

  - `data.date` (string)
    Session date

  - `data.datetime` (string)
    Session date in ISO

  - `data.create_date` (string)
    Session creation date

  - `data.comment` (string)
    Appointment Comment

  - `data.online` (boolean)
    (Read only) Whether the appointment is online or not (false if the appointment was made by an administrator)

  - `data.visit_attendance` (number)
    Visit status, 2 - The user confirmed the appointment, 1 - The user came, the services were provided, 0 - the user is waiting, -1 - the user did not come to the visit

  - `data.attendance` (number)
    Appointment status, 2 - User confirmed the appointment, 1 - The user has arrived, services have been rendered, 0 - the user is waiting, -1 - the user has not come to visit

  - `data.confirmed` (number)
    Appointment confirmation status, 0 - not confirmed, 1 - confirmed

  - `data.seance_length` (number)
    Appointment duration in seconds. Includes technical_break_duration. Equal to the sum of services plus the technical break.

  - `data.length` (number)
    Appointment duration in seconds. Alias of seance_length. Includes technical_break_duration.

  - `data.sms_before` (number)
    Whether to send an SMS reminder to the client (if the client is specified)

  - `data.sms_now` (number)
    Did you send SMS when adding an appointment

  - `data.sms_now_text` (string)
    SMS text

  - `data.email_now` (number)
    Has an email notification been sent?

  - `data.notified` (number)
    Flag for confirmation of the appointment by the location administrator, if the client asked to confirm the appointment

  - `data.master_request` (number)
    Indicates whether a specific team member was selected for the appointment. Set to false if the "any team member" option was chosen

  - `data.api_id` (string)
    External appointment ID

  - `data.from_url` (string)
    From which page the transition was made to complete the appointment (website, VK application, etc.)

  - `data.review_requested` (number)
    Flag for requesting visit feedback from the client

  - `data.is_remind_sms_sent` (boolean)
    Has reminder SMS been sent

  - `data.visit_id` (number)
    Visit ID

  - `data.created_user_id` (number)
    ID of the user who created the appointment

  - `data.deleted` (boolean)
    (Read only) Whether the appointment was deleted (true if deleted)

  - `data.paid_full` (number)
    Flag, whether the appointment is paid in full (1 - if paid in full)

  - `data.prepaid` (boolean)
    Is online payment available

  - `data.prepaid_confirmed` (boolean)
    Online payment status

  - `data.last_change_date` (string)
    The date and time when the appointment was last modified

  - `data.custom_color` (string)
    Log appointment color

  - `data.custom_font_color` (string)
    (Only when reading) Write font color

  - `data.record_labels` (array)
    Post categories

  - `data.activity_id` (integer)
    Group event ID

  - `data.custom_fields` (object,array)
    Custom fields (object or empty array)

  - `data.documents` (array)
    Array of documents

  - `data.documents.id` (number)
    Document ID

  - `data.documents.type_id` (number)
    Document Type

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

  - `data.documents.is_sale_bill_printed` (boolean)
    Is the sales receipt printed?

  - `data.sms_remain_hours` (number,null)
    How many hours before the start of the visit to send an SMS with a reminder

  - `data.email_remain_hours` (number,null)
    How many hours before the start of the visit to send a reminder email

  - `data.bookform_id` (number)
    Online Appointment Form ID

  - `data.record_from` (string)
    Name of online registration form

  - `data.is_mobile` (number)
    Type of device used to register (0 - appointment created by administrator, via web version or mobile app for administrators, 1 - Mobile browser, online appointment widget, 2 - Desktop browser, online appointment widget)

  - `data.is_sale_bill_printed` (boolean)
    Is the sales receipt printed?

  - `data.consumables` (array)
    Consumable Array

  - `data.finance_transactions` (array)
    Array of financial transactions

  - `data.acceptance_free` (boolean,null)
    Acceptance free flag

  - `data.clients_count` (number)
    Number of clients in appointment

  - `data.comer` (boolean,null)
    Comer flag

  - `data.is_update_blocked` (boolean)
    Update blocked flag

  - `data.payment_status` (string,number)
    Payment status

  - `data.resource_instance_ids` (array)
    Resource instance IDs

  - `data.short_link` (string)
    Short link to appointment

  - `data.technical_break_duration` (number)
    Technical break duration in seconds

  - `meta` (object)
    Metadata (contains the page number and the number of appointments per page)
    Example: {"page":1,"total_count":10}

  - `meta.page` (integer)
    Example: 1

  - `meta.total_count` (integer)
    Example: 10

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


