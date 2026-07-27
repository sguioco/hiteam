# Getting Message Statuses

### Get message statuses
| Number | Title |
| ------------- | ------------- |
| 1 | Delivered |
| 2 | Not delivered |
| 4 | Sent to phone |
| 8 | Transferred to the operator |
| 16 | Rejected by operator |
| 52 | Not enough funds |

In the event of an error, the corresponding HTTP status code is returned. In some cases, a descriptive error message is also included in the response.
The following error codes may be returned by all API methods:

| error code | Http status code | Title | Description |
| ------------- | ------------- | ------------- | ------------- |
| 5 | 400 | ENTITY_VALIDATION_ERROR | The request body did not pass validation |
| 10 | 400 | FIELD_VALIDATION_ERROR | Parameter not validated |
| 15 | 403 | ACCESS_FORBIDDEN | The action is not available, the application does not have the required permissions. |
| 20 | 401 | INVALID_PARTNER_TOKEN | partner_token missing or invalid |
| 30 | 404 | RESOURCE_NOT_FOUND | The resource at the requested path does not exist |

When sending SMS, the delivery_callback_url attribute is passed in the request - this is the url to which message statuses should be sent.

Use it to send message statuses. Url to which message statuses should be sent - https://app.alteg.io/smsprovider/status/callback/{partner_token}

Endpoint: POST /delivery/status
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    e.g. application/vnd.api.v2+json
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer partner_token

## Request fields (application/json):

  - `id` (string)
    Identifier

  - `status` (number)
    Message status

  - `payment_sum` (number)
    Full message cost

  - `currency_iso` (string)
    Currency ISO

  - `parts_amount` (number)
    Amount of message's parts


## Response 200 fields

## Response 400 fields

## Response 401 fields

## Response 404 fields
