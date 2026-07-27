# Disable Tips for the team member

Endpoint: POST /tips/{location_id}/settings/{master_tips_settings_id}/disable
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (integer, required)
    location id

  - `master_tips_settings_id` (integer, required)
    tip settings id

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (array)
    Array of objects with data
    Example: [{"id":1,"location_id":253859,"staff_id":742418,"hash":"ba816199-eecf-4bd2-9f1d-db470545bfaf","status":3,"status_title":"pending account","is_enabled":true,"landing_external":"https://app.alteg.io/tips/external/253859/ba816199-eecf-4bd2-9f1d-db470545bfaf/","master_tips_form_link":"https://app.alteg.io/companies/253859/staff/742418/tips/pay/","invite_sms_sent":false,"staff":{"id":742418,"name":"Fusa","specialization":"cosmetologist","avatar":"https://assets.alteg.io/masters/sm/c/c7/c77a4bf2b6b3896_20210304004333.png","employee":{"id":733043,"phone":"+13155550175"},"user":{"id":1553930,"name":"James Smith","email":"j.smith@example.com","phone":"+13155550175"},"position":{"id":103883,"title":"Yogist"}}},{"id":152763,"location_id":253859,"staff_id":743018,"hash":"b7c81cab-290a-4b0a-ad05-9c4b98ef3565","status":4,"status_title":"everything is set","is_enabled":true,"landing_external":"https://app.alteg.io/tips/external/253859/b7c81cab-290a-4b0a-ad05-9c4b98ef3565/","master_tips_form_link":"https://app.alteg.io/companies/253859/staff/743018/tips/pay/","invite_sms_sent":false,"staff":{"id":743018,"name":"Natasha M","specialization":"manicurist","avatar":"https://api.alteg.io/images/no-master-sm.png","employee":{"id":733547,"phone":"+13155550175"},"user":{"id":6259059,"name":"Alice Smith","email":"a.smith@example.com","phone":"+13155550175"},"position":{"id":103731,"title":"Manicurist"}}}]

  - `data.id` (number)
    Setting ID

  - `data.location_id` (integer)

  - `data.staff_id` (number)
    team member ID

  - `data.hash` (string)
    Hash token

  - `data.status` (number)
    Setting status

  - `data.status_title` (string)
    Status name

  - `data.is_enabled` (boolean)
    Is tip setting enabled

  - `data.landing_external` (string)

  - `data.master_tips_form_link` (string)
    Link to the page where you can leave a tip to the team member

  - `data.invite_sms_sent` (boolean)

  - `data.staff` (object)
    Team Member

  - `data.staff.id` (number)
    team member ID

  - `data.staff.name` (string)
    Team Member name

  - `data.staff.specialization` (string)
    Specialization

  - `data.staff.avatar` (string)
    Path to team member profile picture

  - `data.staff.employee` (object)
    team member

  - `data.staff.employee.id` (number)
    team member ID

  - `data.staff.employee.phone` (string)
    Telephone

  - `data.staff.user` (object)
    User

  - `data.staff.user.id` (number)
    User ID

  - `data.staff.user.name` (string)
    Username

  - `data.staff.user.email` (string)
    User email address

  - `data.staff.user.phone` (string)
    User phone

  - `data.staff.position` (object)
    Position

  - `data.staff.position.id` (number)
    Job ID

  - `data.staff.position.title` (string)
    Job title

  - `meta` (object)
    Metadata (contains the number of found team members)
    Example: {"count":2}

  - `meta.count` (integer)
    Example: 2

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


