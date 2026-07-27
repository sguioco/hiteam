# Webhooks

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


## Get event notification settings

 - [GET /hooks_settings/{location_id}](https://developer.alteg.io/en/developers/openapi/webhooks/get_event_notification_settings.md)

## Change Event Notification Settings

 - [POST /hooks_settings/{location_id}](https://developer.alteg.io/en/developers/openapi/webhooks/update_event_notification_settings.md)

## Location Event

 - [POST SalonEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_salon.md): Sent when a location is created, updated, or deleted.

## Team Member Event

 - [POST StaffEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_staff.md): Sent when a team member is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/staff/{staff_id}.

## Service Event

 - [POST ServiceEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_service.md): Sent when a service is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/services/{service_id}.

## Service Category Event

 - [POST ServiceCategoryEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_service_category.md): Sent when a service category is created, updated, or deleted. The data field matches the response from GET /company/{company_id}/service/categories.

## Client Event

 - [POST ClientEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_client.md): Sent when a client is created, updated, or deleted. The data field contains the full client profile with all default includes.

## Appointment Event

 - [POST RecordEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_record.md): Sent when an appointment is created, updated, or deleted. The data field matches the response from GET /record/{company_id}/{record_id}.

## Loyalty Card Event

 - [POST LoyaltyCardEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_loyalty_card.md): Sent when a loyalty card is created, updated, or deleted. Uses a simplified payload with essential fields only.

## Schedule Event

 - [POST ScheduleEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_schedule.md): Sent when a team member's schedule is created, updated, or deleted. The resource_id refers to the team member (staff) ID whose schedule changed. The data field is always an empty array for schedule events.

## Product Event

 - [POST GoodEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_good.md): Sent when a product is created, updated, or deleted. The data field matches the response from GET /goods/{company_id}/{good_id}.

## Product Operation Event

 - [POST GoodsOperationEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_goods_operation.md): Sent when a product operation occurs: sale, receipt, consumable write-off, product write-off, or product movement.
The resource field indicates the specific operation type: goods_operations_sale, goods_operations_receipt, goods_operations_consumable, goods_operations_stolen, goods_operations_move.

## Financial Operation Event

 - [POST FinancesOperationEvent](https://developer.alteg.io/en/developers/openapi/webhooks/webhook_finances_operation.md): Sent when a financial transaction is created, updated, or deleted. May optionally include payment_system_transaction_ids if the feature is enabled for the location.

