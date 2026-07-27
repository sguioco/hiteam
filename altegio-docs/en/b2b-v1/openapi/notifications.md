# Notifications

SMS and email notifications to clients

## Send SMS to the list of clients

 - [POST /sms/clients/by_id/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_sms_to_clients.md): The object for creating SMS mailing has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| client_ids | array of numbers | Array of client IDs |
| text | string | SMS text message |

## Send SMS campaigns to customers matching the filters

 - [POST /sms/clients/by_filter/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_sms_campaign_to_filtered_clients.md): The object for creating SMS mailing has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| text | string | SMS text message |

#### Client filtering
+ fullname:'Joh' (optional, string) - Name (part of name) to filter clients
+ phone:'1315' (optional, string) - Phone (part of the number) to filter clients
+ email:'test@' (optional, string) - Email (part) for client filtering
+ card:'5663rt' (optional, string) - Card (part) to filter customers by loyalty card number

Attention: If there are no filters, SMS mailing will go to the entire database!

## Send Email newsletter according to the list of clients

 - [POST /email/clients/by_id/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_email_newsletter_to_clients.md): The object for creating an Email campaign has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| client_ids | array of numbers | Array of client IDs |
| text | string | Text Email Message |
| subject | string | Email Subject |

## Send email campaigns for clients matching the filters

 - [POST /email/clients/by_filter/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/send_email_campaign_to_filtered_clients.md): The object for creating an Email campaign has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| text | string | Text Email Message |
| subject | string | Email Subject |

#### Client filtering
+ fullname:'Joh' (optional, string) - Name (part of name) to filter clients
+ phone:'1315' (optional, string) - Phone (part of the number) to filter clients
+ email:'test@' (optional, string) - Email (part) for client filtering
+ card:'5663rt' (optional, string) - Card (part) to filter customers by loyalty card number

Attention: If there are no filters, email distribution will go to the entire database!

## Getting Message Statuses

 - [POST /delivery/status](https://developer.alteg.io/en/b2b-v1/openapi/notifications/get_message_status_list.md): ### Get message statuses
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

## Get notification settings in a location

 - [GET /notification_settings/{location_id}/notification_types](https://developer.alteg.io/en/b2b-v1/openapi/notifications/get_location_notification_settings.md): The method allows you to get notification settings in a location.

## Get User Notification Settings

 - [GET /notification_settings/{location_id}/users/{user_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/get_user_notification_settings.md): The method allows you to get notification settings for a particular location user.

## Change User Push Notification Settings

 - [POST /notification_settings/{location_id}/users/{user_id}](https://developer.alteg.io/en/b2b-v1/openapi/notifications/update_user_notification_settings.md): The method allows you to change the user's PUSH notification settings.
The type of notification to be changed (record_create_online_staff or record_create_online_admin, etc.) should be selected based on the type of notification specified by the user (mode: admin or mode: team_member). Note: 'staff' in notification type names is a legacy term for team member.

