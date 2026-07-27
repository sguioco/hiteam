# Marketplace

Marketplace application management, billing, and installation.

## Data About Locations Connected to the Application

 - [GET /marketplace/application/{application_id}/salons](https://developer.alteg.io/en/developers/openapi/marketplace/list_marketplace_app_locations.md): This endpoint retrieves a list of locations that have connected a specific application, along with detailed information about each.

## Get application tariffs

 - [GET /marketplace/application/{application_id}/tariffs](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_applications_tariffs_list.md): Retrieves list of tariffs for the application.

Note: For marketplace partners only.

## Set payment discount for locations

 - [POST /marketplace/application/add_discount](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_application_add_discount.md): Sets a payment discount for specific locations when they pay through Altegio platform.

Note: This endpoint is intended for marketplace partners only.
Requires marketplace partner authorization.

## Generate payment link

 - [GET /marketplace/application/payment_link](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_application_payment_link.md): Generates a payment link for application payment through Altegio platform.

Note: For marketplace partners only.

## Update notification channel availability

 - [POST /marketplace/application/update_channel](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_partner_applications_update_channel.md): Updates available notification channels for the application.

Note: Only for Chat Bots and SMS Aggregators category applications.
For marketplace partners only.

## Application Status Data for Any Location

 - [GET /marketplace/salon/{location_id}/application/{application_id}](https://developer.alteg.io/en/developers/openapi/marketplace/get_marketplace_integration_status.md): This endpoint is used to retrieve information about the application's installation status in a specific location.

## Application Uninstall

 - [POST /marketplace/salon/{location_id}/application/{application_id}/uninstall](https://developer.alteg.io/en/developers/openapi/marketplace/uninstall_marketplace_app.md): This endpoint is used by the partner service to uninstall the application from a specific location.

## Application Installation for a Location

 - [POST /marketplace/partner/callback](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_notification_settings_callback.md): The integration settings of the partner service must be sent to this address. Once received, the application will be configured and installed for the corresponding location.

## Redirect URL after user registration with the partner service

 - [POST /marketplace/partner/callback/redirect](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_notification_settings_redirect_callback.md): After completing registration, the user must be redirected to this URL in the browser, along with any required data needed by the partner service.

## Notify Altegio of Successful Payment

 - [POST /marketplace/partner/payment](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_notification_payment_callback.md): A webhook notification must be sent to this address to inform Altegio of a successful payment made on the partner service’s side.

## Chargeback Notice

 - [POST /marketplace/partner/payment/refund/{payment_id}](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_payment_refund_callback.md): Chargeback Notice

## Notify Altegio of Available SMS Sender Names

 - [POST /marketplace/partner/short_names](https://developer.alteg.io/en/developers/openapi/marketplace/set_marketplace_notification_short_names.md): This endpoint is used to send the list of SMS sender names available to the user. The user will be able to choose from any of the provided sender names.

## Webhook from Altegio About Application Events

 - [POST /marketplace_webhook](https://developer.alteg.io/en/developers/openapi/marketplace/marketplace_webhook.md): Note: This is not a callable endpoint.

This section describes how Altegio sends webhook notifications when specific events occur in the application-to-location lifecycle. The following event types are currently supported:

* uninstall — Sent when the application is disabled on the Altegio side.
* freeze — Sent when the integration is frozen due to service expiration.

You can configure the webhook URL for receiving these events in your Altegio Developer Account.

