# Get notification settings in a location

The method allows you to get notification settings in a location.

Endpoint: GET /notification_settings/{location_id}/notification_types
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer bearer_token, USer user_token

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status
    Example: true

  - `data` (array)
    Array of objects
    Example: [{"type":"record_create_online_staff","channels":{"push":1,"sms":0,"email":1}},{"type":"record_move_admin","channels":{"push":1,"sms":0,"email":0}},{"type":"license_expire","channels":{"push":1,"sms":1,"email":1}},{"type":"record_create_offline_admin","channels":{"push":1,"sms":0,"email":1}},{"type":"record_create_offline_staff","channels":{"push":1,"sms":0,"email":0}},{"type":"record_create_online_admin","channels":{"push":1,"sms":0,"email":1}},{"type":"record_delete_admin","channels":{"push":0,"sms":0,"email":1}},{"type":"record_delete_staff","channels":{"push":1,"sms":0,"email":0}},{"type":"record_move_staff","channels":{"push":0,"sms":0,"email":0}}]

  - `data.type` (string)
    Notification type

  - `data.channels` (object)
    Channels through which notifications will be sent

  - `data.channels.push` (integer)
    PUSH notifications

  - `data.channels.sms` (integer)
    SMS notifications

  - `data.channels.email` (integer)
    Email Notifications

  - `meta` (object)
    Metadata (contains the number of objects)
    Example: {"count":9}

  - `meta.count` (integer)
    Example: 9

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


