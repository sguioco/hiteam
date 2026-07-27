# Get a visit

Endpoint: GET /visits/{visit_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `visit_id` (number, required)
    Example: 12345

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Object with data
    Example: {"attendance":1,"datetime":"2026-09-21T23:00:00.000-05:00","comment":0,"records":[{"id":37955315,"company_id":4564,"staff_id":55436,"services":[],"events":[],"goods_transactions":[],"staff":{"id":55436,"name":"John Doe","specialization":"Manicure and pedicure","position":{"id":1,"title":"Supervisor"},"avatar":"https://app.alteg.io/uploads/masters/sm/b/bb/bb59d4cc17d9b16_20171215174158.png","avatar_big":"https://app.alteg.io/uploads/masters/origin/c/cf/cfb8c5cee58000b_20171215174158.png","rating":4.89,"votes_count":0},"client":{"id":4240788,"name":"dev1","phone":13155550175,"card":415,"email":"","success_visits_count":58,"fail_visits_count":9},"date":"2026-09-21T23:00:00.000-05:00","datetime":"2026-09-21T23:00:00.000-05:00","create_date":"2026-03-22T17:55:14-05:00","comment":"","online":false,"visit_attendance":1,"attendance":1,"confirmed":1,"seance_length":3600,"length":3600,"sms_before":1,"sms_now":1,"sms_now_text":"","email_now":1,"notified":0,"master_request":0,"api_id":"0","from_url":"","review_requested":0,"visit_id":8260852,"created_user_id":999290,"deleted":0,"paid_full":0,"prepaid":0,"prepaid_confirmed":0,"last_change_date":"2026-03-28T17:46:48-05:00","custom_color":"","custom_font_color":"","record_labels":[],"activity_id":0,"custom_fields":{},"documents":[{"id":8172893,"type_id":7,"storage_id":0,"user_id":746310,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}]}]}

  - `data.attendance` (number)
    Visit status
    Example: 1

  - `data.datetime` (string)
    Date of visit
    Example: "2026-09-21T23:00:00.000-05:00"

  - `data.comment` (integer)
    A comment

  - `data.records` (array)
    Appointment array
    Example: [{"id":37955315,"company_id":4564,"staff_id":55436,"services":[],"events":[],"goods_transactions":[],"staff":{"id":55436,"name":"John Doe","specialization":"Manicure and pedicure","position":{"id":1,"title":"Supervisor"},"avatar":"https://app.alteg.io/uploads/masters/sm/b/bb/bb59d4cc17d9b16_20171215174158.png","avatar_big":"https://app.alteg.io/uploads/masters/origin/c/cf/cfb8c5cee58000b_20171215174158.png","rating":4.89,"votes_count":0},"client":{"id":4240788,"name":"dev1","phone":13155550175,"card":415,"email":"","success_visits_count":58,"fail_visits_count":9},"date":"2026-09-21T23:00:00.000-05:00","datetime":"2026-09-21T23:00:00.000-05:00","create_date":"2026-03-22T17:55:14-05:00","comment":"","online":false,"visit_attendance":1,"attendance":1,"confirmed":1,"seance_length":3600,"length":3600,"sms_before":1,"sms_now":1,"sms_now_text":"","email_now":1,"notified":0,"master_request":0,"api_id":"0","from_url":"","review_requested":0,"visit_id":8260852,"created_user_id":999290,"deleted":0,"paid_full":0,"prepaid":0,"prepaid_confirmed":0,"last_change_date":"2026-03-28T17:46:48-05:00","custom_color":"","custom_font_color":"","record_labels":[],"activity_id":0,"custom_fields":{},"documents":[{"id":8172893,"type_id":7,"storage_id":0,"user_id":746310,"company_id":4564,"number":4163,"comment":"","date_created":"2026-09-21T23:00:00.000-05:00","category_id":0,"visit_id":3,"record_id":2,"type_title":"Visit"}]}]

  - `data.records.id` (number)
    Appointment ID

  - `data.records.company_id` (number)
    location ID

  - `data.records.staff_id` (number)
    team member ID

  - `data.records.services` (array)
    Services Array

  - `data.records.events` (array)

  - `data.records.goods_transactions` (array)
    Array of commodity transactions

  - `data.records.staff` (object)
    team member Information

  - `data.records.staff.id` (number)
    team member ID

  - `data.records.staff.name` (string)
    team member name

  - `data.records.staff.specialization` (string)
    team member specialization

  - `data.records.staff.position` (object)
    team member's position

  - `data.records.staff.position.id` (number)
    Job ID

  - `data.records.staff.position.title` (string)
    Job Title

  - `data.records.staff.avatar` (string)
    The path to the file with the team member's avatar

  - `data.records.staff.avatar_big` (string)
    Path to a file with a higher resolution team member avatar

  - `data.records.staff.rating` (number)
    Rating

  - `data.records.staff.votes_count` (number)
    Number of votes that rated the team member

  - `data.records.client` (object)
    Client Information

  - `data.records.client.id` (number)
    Client ID

  - `data.records.client.name` (string)
    Client name

  - `data.records.client.phone` (string)
    Customer phone number

  - `data.records.client.card` (string)
    Client card number

  - `data.records.client.email` (string)
    Client's email address

  - `data.records.client.success_visits_count` (number)
    Number of customer visits, in the "Customer arrived" status

  - `data.records.client.fail_visits_count` (number)
    Number of canceled customer visits

  - `data.records.date` (string)
    Date of visit

  - `data.records.datetime` (string)
    Date of visit in ISO format

  - `data.records.create_date` (string)
    Date the visit was created

  - `data.records.comment` (string)
    Commentary on the visit

  - `data.records.online` (boolean)
    (Read only) Whether the appointment is online or not (false if the appointment was made by an administrator)

  - `data.records.visit_attendance` (number)
    Visit status

  - `data.records.attendance` (number)
    Status of the appointment in the visit

  - `data.records.confirmed` (number)
    Is the appointment verified?

  - `data.records.seance_length` (number)
    Appointment duration in seconds. Includes technical_break_duration. Equal to the sum of services plus the technical break.

  - `data.records.length` (number)
    Appointment duration in seconds. Alias of seance_length. Includes technical_break_duration.

  - `data.records.sms_before` (number)
    Whether to send an SMS reminder to the client (if the client is specified)

  - `data.records.sms_now` (number)
    Did you send SMS when adding an appointment

  - `data.records.sms_now_text` (string)
    SMS text

  - `data.records.email_now` (number)
    Has an email notification been sent?

  - `data.records.notified` (number)
    Flag for confirmation of the appointment by the location administrator, if the client asked to confirm the appointment

  - `data.records.master_request` (number)
    Indicates whether a specific team member was selected for the appointment. Set to false if the "any team member" option was chosen

  - `data.records.api_id` (string)
    External appointment ID

  - `data.records.from_url` (string)
    From which page the transition was made to complete the appointment (website, VK application, etc.)

  - `data.records.review_requested` (number)
    Flag for requesting visit feedback from the client

  - `data.records.activity_id` (number)
    Group event ID

  - `data.records.documents` (array)

  - `data.records.documents.id` (number)
    Document ID

  - `data.records.documents.type_id` (number)
    Document type

  - `data.records.documents.storage_id` (number)
    Inventory ID

  - `data.records.documents.user_id` (number)
    ID of the user who created the document

  - `data.records.documents.company_id` (number)
    location ID

  - `data.records.documents.number` (number)
    Document Number

  - `data.records.documents.comment` (string)
    Document comment

  - `data.records.documents.date_created` (string)
    Document creation date

  - `data.records.documents.category_id` (integer)
    Product category ID

  - `data.records.documents.visit_id` (integer)
    Visit ID

  - `data.records.documents.record_id` (integer)
    Appointment ID

  - `data.records.documents.type_title` (string)
    The name of the entity to which the document belongs

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


