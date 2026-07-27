# Get an Appointment

Endpoint: GET /record/{location_id}/{record_id}
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

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"id":2,"company_id":4564,"staff_id":9,"services":[{"id":1,"title":"Hair extension","cost":100,"manual_cost":100,"cost_per_unit":100,"discount":0,"first_cost":100,"amount":1}],"goods_transactions":[],"staff":{"id":9,"name":"Alex Taylor","specialization":"hair extension","position":{"id":1,"title":"Administrator"},"avatar":"http://app.alteg.io/images/no-master-sm.png","avatar_big":"http://app.alteg.io/images/no-master.png","rating":0,"votes_count":0},"client":{"id":18936825,"name":"lx","phone":"+13155550175","card":"","email":"client@example.com","success_visits_count":37,"fail_visits_count":3},"clients_count":1,"date":"2026-09-21T23:00:00.000-05:00","datetime":"2026-09-21T23:00:00.000-05:00","create_date":"2026-01-17T19:41:44-0500","comment":"do not write down","visit_attendance":0,"attendance":0,"confirmed":1,"seance_length":3600,"length":3600,"sms_before":0,"sms_now":0,"sms_now_text":"","email_now":0,"notified":0,"master_request":0,"api_id":"","from_url":"","review_requested":0,"visit_id":8263004,"created_user_id":1073232,"deleted":false,"paid_full":0,"prepaid":false,"prepaid_confirmed":false,"last_change_date":"2026-01-17T19:44:14-0500","custom_color":"f44336","custom_font_color":"#ffffff","record_labels":[{"id":67345,"title":"the team member is not important","color":"#009800","icon":"unlock","font_color":"#ffffff"},{"id":104474,"title":"interesting category","color":"#3b2c54","icon":"star","font_color":"#ffffff"}],"activity_id":0,"custom_fields":{},"documents":[{"id":8172893,"type_id":7,"storage_id":0,"user_id":1073232,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}],"sms_remain_hours":5,"email_remain_hours":1,"bookform_id":0,"record_from":"","is_mobile":0,"is_sale_bill_printed":false,"consumables":[{"id":2173068,"document_id":8174153,"type_id":2,"company_id":4564,"good_id":4853087,"amount":-1,"cost_per_unit":0.03,"discount":0,"cost":0.03,"unit_id":216761,"operation_unit_type":2,"storage_id":91548,"supplier_id":0,"client_id":0,"master_id":0,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"","service_id":1,"user_id":1073232,"deleted":false,"pkg_amount":0}],"finance_transactions":[{"id":6024243,"document_id":8174152,"date":"2026-09-21T23:00:00.000-05:00","type_id":5,"expense_id":5,"account_id":90459,"amount":100,"client_id":18936825,"master_id":0,"supplier_id":0,"comment":"","item_id":1,"target_type_id":1,"record_id":2,"goods_transaction_id":0,"expense":{"id":5,"title":"Provision of services"},"account":{"id":90459,"title":"Main location account"},"client":{"id":18936825,"name":"lx","phone":"+13155550175"},"master":[],"supplier":[]}]}

  - `data.id` (number)
    Appointment ID
    Example: 2

  - `data.company_id` (number)
    location ID
    Example: 4564

  - `data.staff_id` (number)
    team member ID
    Example: 9

  - `data.services` (array)
    Array of objects with services in the appointment
    Example: [{"id":1,"title":"Hair extension","cost":100,"manual_cost":100,"cost_per_unit":100,"discount":0,"first_cost":100,"amount":1}]

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

  - `data.services.staff_service_link` (object)
    Team member service link configuration

  - `data.services.staff_service_link.length` (number)
    Service duration in seconds

  - `data.services.company_service_link` (object)
    Location service link configuration

  - `data.services.company_service_link.price_min` (number)
    Minimum price

  - `data.services.company_service_link.price_max` (number)
    Maximum price

  - `data.goods_transactions` (array)
    Array of commodity transactions
    Example: []

  - `data.staff` (object)
    team member data object
    Example: {"id":9,"name":"Alex Taylor","specialization":"hair extension","position":{"id":1,"title":"Administrator"},"avatar":"http://app.alteg.io/images/no-master-sm.png","avatar_big":"http://app.alteg.io/images/no-master.png","rating":0,"votes_count":0}

  - `data.staff.id` (number)
    team member ID
    Example: 9

  - `data.staff.api_id` (string,null)
    team member External ID

  - `data.staff.name` (string)
    team member name
    Example: "Alex Taylor"

  - `data.staff.specialization` (string)
    team member specialization
    Example: "hair extension"

  - `data.staff.position` (object)
    team member's position
    Example: {"id":1,"title":"Administrator"}

  - `data.staff.position.id` (number)
    Job ID
    Example: 1

  - `data.staff.position.title` (string)
    Job title
    Example: "Administrator"

  - `data.staff.position.services_binding_type` (number)
    Services binding type

  - `data.staff.avatar` (string)
    The path to the file with the team member's avatar
    Example: "http://app.alteg.io/images/no-master-sm.png"

  - `data.staff.avatar_big` (string)
    Let to the file with the team member's profile picture in high resolution
    Example: "http://app.alteg.io/images/no-master.png"

  - `data.staff.rating` (number)
    team member Rating

  - `data.staff.votes_count` (number)
    Number of votes that rated the team member

  - `data.client` (object,null)
    Customer data (may be empty)
    Example: {"id":18936825,"name":"lx","phone":"+13155550175","card":"","email":"client@example.com","success_visits_count":37,"fail_visits_count":3}

  - `data.client.id` (number)
    Client ID
    Example: 18936825

  - `data.client.name` (string)
    Client first name
    Example: "lx"

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
    Example: "+13155550175"

  - `data.client.card` (string)
    Client card number

  - `data.client.email` (string)
    Client email
    Example: "client@example.com"

  - `data.client.success_visits_count` (number)
    Number of successful visits
    Example: 37

  - `data.client.fail_visits_count` (number)
    Number of failed visits
    Example: 3

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
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.datetime` (string)
    Session date in ISO
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.create_date` (string)
    Session creation date
    Example: "2026-01-17T19:41:44-0500"

  - `data.comment` (string)
    Appointment Comment
    Example: "do not write down"

  - `data.online` (boolean)
    (Read only) Whether the appointment is online or not (false if the appointment was made by an administrator)

  - `data.visit_attendance` (number)
    Visit status, 2 - The user confirmed the appointment, 1 - The user came, the services were provided, 0 - the user is waiting, -1 - the user did not come to the visit

  - `data.attendance` (number)
    Appointment status, 2 - User confirmed the appointment, 1 - The user has arrived, services have been rendered, 0 - the user is waiting, -1 - the user has not come to visit

  - `data.confirmed` (number)
    Appointment confirmation status, 0 - not confirmed, 1 - confirmed
    Example: 1

  - `data.seance_length` (number)
    Appointment duration in seconds. Includes technical_break_duration. Equal to the sum of services plus the technical break.
    Example: 3600

  - `data.length` (number)
    Appointment duration in seconds. Alias of seance_length. Includes technical_break_duration.
    Example: 3600

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
    Example: 8263004

  - `data.created_user_id` (number)
    ID of the user who created the appointment
    Example: 1073232

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
    Example: "2026-01-17T19:44:14-0500"

  - `data.custom_color` (string)
    Log appointment color
    Example: "f44336"

  - `data.custom_font_color` (string)
    (Only when reading) Write font color
    Example: "#ffffff"

  - `data.record_labels` (array)
    Array of appointment categories
    Example: [{"id":67345,"title":"the team member is not important","color":"#009800","icon":"unlock","font_color":"#ffffff"},{"id":104474,"title":"interesting category","color":"#3b2c54","icon":"star","font_color":"#ffffff"}]

  - `data.record_labels.id` (integer)
    Category ID

  - `data.record_labels.title` (string)
    name of category

  - `data.record_labels.color` (string)
    Category color

  - `data.record_labels.icon` (string)
    Icon

  - `data.record_labels.font_color` (string)
    Category font color

  - `data.activity_id` (number)
    Group event ID

  - `data.custom_fields` (object,array)
    Custom appointment fields (object or empty array)
    Example: {}

  - `data.documents` (array)
    Example: [{"id":8172893,"type_id":7,"storage_id":0,"user_id":1073232,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}]

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
    Example: 5

  - `data.email_remain_hours` (number,null)
    How many hours before the start of the visit to send a reminder email
    Example: 1

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
    Example: [{"id":2173068,"document_id":8174153,"type_id":2,"company_id":4564,"good_id":4853087,"amount":-1,"cost_per_unit":0.03,"discount":0,"cost":0.03,"unit_id":216761,"operation_unit_type":2,"storage_id":91548,"supplier_id":0,"client_id":0,"master_id":0,"create_date":"2026-09-21T23:00:00.000-05:00","comment":"","service_id":1,"user_id":1073232,"deleted":false,"pkg_amount":0}]

  - `data.consumables.id` (number)
    Transaction ID

  - `data.consumables.document_id` (integer)
    Document ID

  - `data.consumables.type_id` (number)
    Transaction type

  - `data.consumables.company_id` (number)
    location ID

  - `data.consumables.good_id` (number)
    Item ID

  - `data.consumables.amount` (number)
    Quantity of products

  - `data.consumables.cost_per_unit` (number)
    Unit price

  - `data.consumables.discount` (number)
    Discount

  - `data.consumables.cost` (number)
    the total cost

  - `data.consumables.unit_id` (number)
    Unit ID

  - `data.consumables.operation_unit_type` (number)
    Unit type: 1 - for sale, 2 - for write-off

  - `data.consumables.storage_id` (number)
    Inventory ID

  - `data.consumables.supplier_id` (number)
    Vendor ID

  - `data.consumables.client_id` (number)
    Client ID

  - `data.consumables.master_id` (number)
    team member ID

  - `data.consumables.create_date` (string)
    Transaction creation date

  - `data.consumables.comment` (string)
    A comment

  - `data.consumables.service_id` (number)
    Service ID

  - `data.consumables.user_id` (number)
    User ID

  - `data.consumables.deleted` (boolean)
    Status deleted transaction, 1 - if deleted

  - `data.consumables.pkg_amount` (number)
    Number of packages

  - `data.finance_transactions` (array)
    Array of financial transactions
    Example: [{"id":6024243,"document_id":8174152,"date":"2026-09-21T23:00:00.000-05:00","type_id":5,"expense_id":5,"account_id":90459,"amount":100,"client_id":18936825,"master_id":0,"supplier_id":0,"comment":"","item_id":1,"target_type_id":1,"record_id":2,"goods_transaction_id":0,"expense":{"id":5,"title":"Provision of services"},"account":{"id":90459,"title":"Main location account"},"client":{"id":18936825,"name":"lx","phone":"+13155550175"},"master":[],"supplier":[]}]

  - `data.finance_transactions.id` (number)
    Financial transaction ID

  - `data.finance_transactions.document_id` (number)
    Document ID

  - `data.finance_transactions.date` (string)
    date of creation

  - `data.finance_transactions.type_id` (number)
    Payment item type

  - `data.finance_transactions.expense_id` (number)
    Payment Item ID

  - `data.finance_transactions.account_id` (number)
    Checkout ID

  - `data.finance_transactions.amount` (number)
    Transaction amount

  - `data.finance_transactions.client_id` (number)
    Client ID

  - `data.finance_transactions.master_id` (number)
    team member ID

  - `data.finance_transactions.supplier_id` (number)
    Vendor ID

  - `data.finance_transactions.comment` (string)
    A comment

  - `data.finance_transactions.item_id` (number)
    Item ID (0 if item is a category)

  - `data.finance_transactions.target_type_id` (integer)

  - `data.finance_transactions.record_id` (number)
    Appointment ID

  - `data.finance_transactions.goods_transaction_id` (number)
    Commodity transaction ID

  - `data.finance_transactions.expense` (object)
    Payment item

  - `data.finance_transactions.expense.id` (number)
    Payment Item ID

  - `data.finance_transactions.expense.title` (string)
    Name of payment item

  - `data.finance_transactions.account` (object)
    Location account

  - `data.finance_transactions.account.id` (number)
    Checkout ID

  - `data.finance_transactions.account.title` (string)
    Location account name

  - `data.finance_transactions.client` (object)

  - `data.finance_transactions.client.id` (number)
    Client ID

  - `data.finance_transactions.client.name` (string)
    Client name

  - `data.finance_transactions.client.phone` (string)
    Customer phone

  - `data.finance_transactions.master` (array)
    team members

  - `data.finance_transactions.supplier` (array)
    Suppliers

  - `data.acceptance_free` (boolean,null)
    Acceptance free flag

  - `data.clients_count` (number)
    Number of clients in appointment
    Example: 1

  - `data.comer` (boolean,null)
    Comer flag

  - `data.comer_person_info` (object,null)
    Comer person information

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

  - `meta` (array)
    Metadata (empty array)
    Example: []

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


