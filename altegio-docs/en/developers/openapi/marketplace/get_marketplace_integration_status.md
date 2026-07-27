# Application Status Data for Any Location

This endpoint is used to retrieve information about the application's installation status in a specific location.

Endpoint: GET /marketplace/salon/{location_id}/application/{application_id}
Version: 1.0.0
Security: BearerPartner

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

## Path parameters:

  - `location_id` (number, required)
    Location ID

  - `application_id` (number, required)
    Application ID

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.
    Example: true

  - `data` (object)
    Example: {"logs":[{"changed_at":"2022-06-27 12:20:02","status_from":"uninstalled","status_to":"pending","source":"marketplace"},{"changed_at":"2022-06-27 12:22:02","status_from":"pending","status_to":"active","source":"partner_api"}],"payments":[{"id":1523,"payment_sum":1523.12,"payment_date":"2022-06-27 12:22:02","is_refunded":false,"period_from":"2022-06-27 00:00:00","period_to":"2022-07-27 00:00:00"}],"connection_status":{"status":"active","created_at":"2022-06-27 12:20:02"}}

  - `data.connection_status` (object)
    Installation status
    Example: {"status":"active","created_at":"2022-06-27 12:20:02"}

  - `data.connection_status.status` (string)
    Application installation status in the location. Pending - waiting for activation from the partner, Freezed - frozen due to non-payment, Active - active
    Enum: "pending", "freezed", "active"

  - `data.connection_status.created_at` (string)
    Date of link creation
    Example: "2022-06-27 12:20:02"

  - `data.payments` (array)
    Payments list
    Example: [{"id":1523,"payment_sum":1523.12,"payment_date":"2022-06-27 12:22:02","is_refunded":false,"period_from":"2022-06-27 00:00:00","period_to":"2022-07-27 00:00:00"}]

  - `data.payments.payment_sum` (number)
    The payment amount for the period.

  - `data.payments.id` (number)
    Payment ID.

  - `data.payments.payment_date` (string)
    The date of payment.

  - `data.payments.is_refunded` (boolean)
    Was there a refund?

  - `data.payments.period_from` (string)
    Subscription start date

  - `data.payments.period_to` (string)
    Subscription end date

  - `data.logs` (array)
    Application status change log in location
    Example: [{"changed_at":"2022-06-27 12:20:02","status_from":"uninstalled","status_to":"pending","source":"marketplace"},{"changed_at":"2022-06-27 12:22:02","status_from":"pending","status_to":"active","source":"partner_api"}]

  - `data.logs.changed_at` (string)
    Status change date

  - `data.logs.status_from` (string)
    Previous app status in location

  - `data.logs.status_to` (string)
    New application status in the location

  - `data.logs.source` (string)
    Status Change Source

  - `meta` (object,array)
    Additional response data (empty object or empty array)

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


