# VoIP Integration

Telephony integration endpoints.

## VoIP events

 - [POST /voip/integration](https://developer.alteg.io/en/developers/openapi/voip-integration/handle_voip_integration_event.md): #### Enable integration
To use the api and activate access to the settings in the user interface, you need to activate the integration by sending the "Enable integration" request. After a successful connection, access to the section with routing settings will be opened in the chain user interface.

#### Disable integration
To disable the integration, you can use the "Disable integration" method. After the integration is disabled, access to the user interface settings section is closed, the requests "Call notification" and "Call information saving" are not processed.

#### Call notification
To display notifications about an incoming call, the "Call notification" method is used, the call type ("incoming", "outgoing", "internal") is specified in the parameters, but currently notifications are displayed only for the "incoming" value. Notifications are displayed for users defined based on routing settings. When specifying the "user" and "diversion" parameters at the same time, "user" is the priority when searching for routes.

#### Saving call information
The information about the call is automatically saved to the chain history and to the history of chain locations in accordance with the call routing settings.

## Get Location's Call List

 - [GET /voip/integration/calls](https://developer.alteg.io/en/developers/openapi/voip-integration/list_voip_calls.md): This endpoint is designed to get a list of calls in a location, taking into account filters and pagination

