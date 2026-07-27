# Update a service (partial)

Method to partially update a service

Endpoint: PATCH /services/{location_id}/{service_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `service_id` (number, required)
    Service ID

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token, User user_token

## Request fields (application/json):

  - `title` (string, required)
    Service name
    Example: "Men's haircut"

  - `category_id` (number, required)
    ID service category
    Example: 83167

  - `price_min` (number, required)
    Minimum cost of the service
    Example: 1300

  - `price_max` (number, required)
    Maximum cost of the service
    Example: 1300

  - `duration` (number, required)
    Service duration, default value is 3600
    Example: 3600

  - `booking_title` (string, required)
    Service name for appointment
    Example: "Men's haircut"

  - `is_multi` (boolean, required)
    false - Appointment, true - Event

  - `tax_variant` (number, required)
    Bill ID
    Example: 1

  - `vat_id` (number, required)
    VAT ID
    Example: 3

  - `is_need_limit_date` (boolean, required)
    The service is available for a limited time
    Example: true

  - `seance_search_start` (number, required)
    Start of period is the appointment available, in seconds
    Example: 36000

  - `seance_search_finish` (number, required)
    End of period is the appointment available, in seconds
    Example: 84600

  - `step` (number, required)
    Display interval of slots, in seconds
    Example: 300

  - `seance_search_step` (number, required)
    Search interval of slots, in seconds
    Example: 900

  - `technical_break_duration` (any)
    Technical break duration in seconds.
- If not provided, defaults to null
- null = use location default (Settings → Appointment Log → Technical Breaks)
- Must be in multiples of 300 (5-minute intervals)
- Maximum value is 3600 (1 hour)

  - `discount` (number)
    Service discount

  - `comment` (string)
    Comment on the service

  - `date_from` (string)
    Service availability start date (YYYY-MM-DD)
    Example: "2022-09-19"

  - `date_to` (string)
    Service availability end date (YYYY-MM-DD)
    Example: "2022-09-30"

  - `weight` (number)
    Service weight (used to sort services when displayed)
    Example: 6

  - `active` (number)
    1 - available for online booking, 0 - not available
    Example: 1

  - `api_id` (string)
    External Service ID
    Example: "00000000042"

  - `staff` (array)
    List of team members providing the service and session duration
    Example: [{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600},{"id":8973,"seance_length":3600},{"id":13616,"seance_length":3600},{"id":16681,"seance_length":3600},{"id":1796,"seance_length":3600},{"id":34006,"seance_length":3600}]

  - `staff.id` (number)
    team member ID

  - `staff.seance_length` (number)
    Service duration (multiple of 15 minutes)

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status (true)
    Example: true

  - `data` (object)
    Example: {"title":"Men's haircut","booking_title":"Men's haircut","category_id":83167,"price_min":1300,"price_max":1300,"duration":3600,"discount":0,"tax_variant":1,"vat_id":3,"is_multi":false,"is_need_limit_date":true,"date_from":"2022-09-19","date_to":"2022-09-30","seance_search_start":36000,"seance_search_finish":84600,"step":300,"seance_search_step":900,"comment":"","weight":6,"active":1,"api_id":"00000000042","staff":[{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600},{"id":8973,"seance_length":3600},{"id":13616,"seance_length":3600},{"id":16681,"seance_length":3600},{"id":1796,"seance_length":3600},{"id":34006,"seance_length":3600}]}

  - `data.title` (string)
    Service name
    Example: "Men's haircut"

  - `data.booking_title` (string)
    Service name for appointment
    Example: "Men's haircut"

  - `data.category_id` (number)
    ID service category
    Example: 83167

  - `data.price_min` (number)
    Minimum cost of the service
    Example: 1300

  - `data.price_max` (number)
    Maximum cost of the service
    Example: 1300

  - `data.duration` (number)
    Service duration, default value is 3600
    Example: 3600

  - `data.technical_break_duration` (any)
    Technical break duration in seconds.
- null = use location default
- Value in multiples of 300 (5-minute intervals)

  - `data.discount` (number)
    Service discount

  - `data.comment` (string)
    Comment on the service

  - `data.is_multi` (boolean)
    false - Appointment, true - Event

  - `data.tax_variant` (number)
    Bill ID
    Example: 1

  - `data.vat_id` (number)
    VAT ID
    Example: 3

  - `data.is_need_limit_date` (boolean)
    The service is available for a limited time
    Example: true

  - `data.date_from` (string)
    Service availability start date (YYYY-MM-DD)
    Example: "2022-09-19"

  - `data.date_to` (string)
    Service availability end date (YYYY-MM-DD)
    Example: "2022-09-30"

  - `data.seance_search_start` (number)
    Start of period is the appointment available, in seconds
    Example: 36000

  - `data.seance_search_finish` (number)
    End of period is the appointment available, in seconds
    Example: 84600

  - `data.step` (number)
    Display interval of slots, in seconds
    Example: 300

  - `data.seance_search_step` (number)
    Search interval of slots, in seconds
    Example: 900

  - `data.weight` (number)
    Service weight (used to sort services when displayed)
    Example: 6

  - `data.active` (number)
    1 - available for online booking, 0 - not available
    Example: 1

  - `data.api_id` (string)
    External Service ID
    Example: "00000000042"

  - `data.print_title` (string)
    Service title for printing

  - `data.service_type` (number)
    Service type

  - `data.api_service_id` (number)
    External API service ID

  - `data.repeat_visit_days_step` (string,null)
    Repeat visit days step

  - `data.schedule_template_type` (number)
    Schedule template type

  - `data.online_invoicing_status` (number)
    Online invoicing status

  - `data.is_abonement_autopayment_enabled` (number)
    Is membership autopayment enabled (1/0)

  - `data.autopayment_before_visit_time` (number)
    Autopayment before visit time

  - `data.abonement_restriction_value` (number)
    Membership restriction value

  - `data.is_chain` (boolean)
    Is chain service

  - `data.is_price_managed_only_in_chain` (boolean)
    Is price managed only in chain

  - `data.is_comment_managed_only_in_chain` (boolean)
    Is comment managed only in chain

  - `data.price_prepaid_amount` (number)
    Prepaid amount

  - `data.price_prepaid_percent` (number)
    Prepaid percent

  - `data.id` (number)
    Service ID

  - `data.salon_service_id` (number)
    Location service ID

  - `data.prepaid` (string)
    Prepaid status (forbidden/optional/required)

  - `data.capacity` (number)
    Service capacity

  - `data.image_group` (array)
    Image group

  - `data.dates` (array)
    Service dates

  - `data.resources` (array)
    Service resources

  - `data.is_online` (boolean)
    Is available for online booking

  - `data.staff` (array)
    List of team members providing the service and session duration
    Example: [{"id":5905,"seance_length":2700},{"id":5907,"seance_length":3600},{"id":8973,"seance_length":3600},{"id":13616,"seance_length":3600},{"id":16681,"seance_length":3600},{"id":1796,"seance_length":3600},{"id":34006,"seance_length":3600}]

  - `data.staff.id` (number)
    team member ID

  - `data.staff.seance_length` (number)
    Service duration (multiple of 15 minutes)

  - `data.staff.technological_card_id` (number,null)
    Technological card ID

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


