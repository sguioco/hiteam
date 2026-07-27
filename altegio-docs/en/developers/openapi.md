# Developer Tools

APIs for partners building integrations with the Altegio platform.
**Base URL:** `https://api.alteg.io/api`
## Available Methods
**Marketplace** — Manage your marketplace applications: list connected locations, configure tariffs, handle billing, process installation/uninstallation callbacks.
**Webhooks** — Configure event notifications for your integrations. Receive real-time updates when appointments, clients, or other entities change.
**VoIP Integration** — Connect telephony systems to match incoming calls with client records and log call history.
**Dictionaries** — Reference data for building forms and validations: countries, cities, business types.

Version: 1.0.0
License: Altegio API Agreement

## Servers

Production
```
https://api.alteg.io/api/v1
```

## Security

### BearerPartner

Partner API token for accessing developer endpoints

Type: http
Scheme: bearer
Bearer Format: Bearer {PartnerToken}

### BearerPartnerUser

Combined partner and user tokens for authenticated user operations

Type: http
Scheme: bearer
Bearer Format: Bearer {PartnerToken}, User {UserToken}

## Download OpenAPI description

[Developer Tools](https://developer.alteg.io/_bundle/en/developers/openapi.yaml)

## Marketplace

Marketplace application management, billing, and installation.

### Data About Locations Connected to the Application

 - [GET /marketplace/application/{application_id}/salons](https://developer.alteg.io/en/developers/openapi/marketplace/list_marketplace_app_locations.md): This endpoint retrieves a list of locations that have connected a specific application, along with detailed information about each.

### Get application tariffs

 - [GET /marketplace/application/{application_id}/tariffs](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_applications_tariffs_list.md): Retrieves list of tariffs for the application.

Note: For marketplace partners only.

### Set payment discount for locations

 - [POST /marketplace/application/add_discount](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_application_add_discount.md): Sets a payment discount for specific locations when they pay through Altegio platform.

Note: This endpoint is intended for marketplace partners only.
Requires marketplace partner authorization.

### Generate payment link

 - [GET /marketplace/application/payment_link](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_application_payment_link.md): Generates a payment link for application payment through Altegio platform.

Note: For marketplace partners only.

### Update notification channel availability

 - [POST /marketplace/application/update_channel](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_applications_update_channel.md): Updates available notification channels for the application.

Note: Only for Chat Bots and SMS Aggregators category applications.
For marketplace partners only.

### Application Status Data for Any Location

 - [GET /marketplace/salon/{location_id}/application/{application_id}](https://developer.alteg.io/en/developers/openapi/marketplace/get_marketplace_integration_status.md): This endpoint is used to retrieve information about the application's installation status in a specific location.

### Application Uninstall

 - [POST /marketplace/salon/{location_id}/application/{application_id}/uninstall](https://developer.alteg.io/en/developers/openapi/marketplace/uninstall_marketplace_app.md): This endpoint is used by the partner service to uninstall the application from a specific location.

### Application Installation for a Location

 - [POST /marketplace/partner/callback](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_notification_settings_callback.md): The integration settings of the partner service must be sent to this address. Once received, the application will be configured and installed for the corresponding location.

### Redirect URL after user registration with the partner service

 - [POST /marketplace/partner/callback/redirect](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_notification_settings_redirect_callback.md): After completing registration, the user must be redirected to this URL in the browser, along with any required data needed by the partner service.

### Notify Altegio of Successful Payment

 - [POST /marketplace/partner/payment](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_notification_payment_callback.md): A webhook notification must be sent to this address to inform Altegio of a successful payment made on the partner service’s side.

### Chargeback Notice

 - [POST /marketplace/partner/payment/refund/{payment_id}](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_payment_refund_callback.md): Chargeback Notice

### Notify Altegio of Available SMS Sender Names

 - [POST /marketplace/partner/short_names](https://developer.alteg.io/en/developers/openapi/marketplace/set_marketplace_notification_short_names.md): This endpoint is used to send the list of SMS sender names available to the user. The user will be able to choose from any of the provided sender names.

### Webhook from Altegio About Application Events

 - [POST /marketplace_webhook](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_webhook.md): Note: This is not a callable endpoint.

This section describes how Altegio sends webhook notifications when specific events occur in the application-to-location lifecycle. The following event types are currently supported:

* uninstall — Sent when the application is disabled on the Altegio side.
* freeze — Sent when the integration is frozen due to service expiration.

You can configure the webhook URL for receiving these events in your Altegio Developer Account.

## Webhooks

Webhook configuration and event notifications.

Altegio sends real-time HTTP POST notifications to your configured URLs when
events occur in subscribed locations. Each notification contains a JSON payload
with the event envelope (`company_id`, `resource`, `resource_id`, `status`)
and the full resource `data`.

**Delivery details:**
- Method: POST
- Content-Type: application/json
- Delivery delay: ~5 seconds after the event
- Your endpoint must respond with a 2xx status code

**Configuration:** Use the [Webhook Settings](#tag/Webhooks/operation/get_event_notification_settings)
endpoint to subscribe to specific resource types.

**Retry behavior:**
- If your endpoint returns a non-2xx status or times out, the delivery is considered failed
- Failed deliveries are not retried automatically
- Webhook delivery timeout: 15 seconds


### Get event notification settings

 - [GET /hooks_settings/{location_id}](https://developer.alteg.io/en/developers/openapi/webhooks/get_event_notification_settings.md)

### Change Event Notification Settings

 - [POST /hooks_settings/{location_id}](https://developer.alteg.io/en/developers/openapi/webhooks/update_event_notification_settings.md)

### Location Event

 - [POST SalonEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_salon.md): Sent when a location is created, updated, or deleted.

### Team Member Event

 - [POST StaffEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_staff.md): Sent when a team member is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/staff/{staff_id}.

### Service Event

 - [POST ServiceEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_service.md): Sent when a service is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/services/{service_id}.

### Service Category Event

 - [POST ServiceCategoryEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_service_category.md): Sent when a service category is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/service/categories.

### Client Event

 - [POST ClientEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_client.md): Sent when a client is created, updated, or deleted. The data field contains the full client profile with all default includes.

### Appointment Event

 - [POST RecordEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_record.md): Sent when an appointment is created, updated, or deleted. The data field matches the response from GET /record/{company_id}/{record_id}.

### Loyalty Card Event

 - [POST LoyaltyCardEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_loyalty_card.md): Sent when a loyalty card is created, updated, or deleted. Uses a simplified payload with essential fields only.

### Schedule Event

 - [POST ScheduleEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_schedule.md): Sent when a team member's schedule is created, updated, or deleted. The resource_id refers to the team member (staff) ID whose schedule changed. The data field is always an empty array for schedule events.

### Product Event

 - [POST GoodEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_good.md): Sent when a product is created, updated, or deleted. The data field matches the response from GET /goods/{company_id}/{good_id}.

### Product Operation Event

 - [POST GoodsOperationEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_goods_operation.md): Sent when a product operation occurs: sale, receipt, consumable write-off, product write-off, or product movement.
The resource field indicates the specific operation type: goods_operations_sale, goods_operations_receipt, goods_operations_consumable, goods_operations_stolen, goods_operations_move.

### Financial Operation Event

 - [POST FinancesOperationEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_finances_operation.md): Sent when a financial transaction is created, updated, or deleted. May optionally include payment_system_transaction_ids if the feature is enabled for the location.

## VoIP Integration

Telephony integration endpoints.

### VoIP events

 - [POST /voip/integration](https://developer.alteg.io/en/developers/openapi/voip-integration/handle_voip_integration_event.md): #### Enable integration
To use the api and activate access to the settings in the user interface, you need to activate the integration by sending the "Enable integration" request. After a successful connection, access to the section with routing settings will be opened in the chain user interface.

#### Disable integration
To disable the integration, you can use the "Disable integration" method. After the integration is disabled, access to the user interface settings section is closed, the requests "Call notification" and "Call information saving" are not processed.

#### Call notification
To display notifications about an incoming call, the "Call notification" method is used, the call type ("incoming", "outgoing", "internal") is specified in the parameters, but currently notifications are displayed only for the "incoming" value. Notifications are displayed for users defined based on routing settings. When specifying the "user" and "diversion" parameters at the same time, "user" is the priority when searching for routes.

#### Saving call information
The information about the call is automatically saved to the chain history and to the history of chain locations in accordance with the call routing settings.

### Get Location's Call List

 - [GET /voip/integration/calls](https://developer.alteg.io/en/developers/openapi/voip-integration/list_voip_calls.md): This endpoint is designed to get a list of calls in a location, taking into account filters and pagination

## Dictionaries

Reference data (countries, cities, business types).

### Get a list of countries

 - [GET /countries](https://developer.alteg.io/en/developers/openapi/dictionaries/get_country_list.md)

### Get a list of cities

 - [GET /cities](https://developer.alteg.io/en/developers/openapi/dictionaries/get_city_list.md)

### Get business types by group

 - [GET /references/business_groups_with_types](https://developer.alteg.io/en/developers/openapi/dictionaries/get_business_types_by_group.md)

