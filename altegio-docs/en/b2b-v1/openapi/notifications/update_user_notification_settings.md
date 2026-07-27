# Change User Push Notification Settings

The method allows you to change the user's PUSH notification settings.
The type of notification to be changed (record_create_online_staff or record_create_online_admin, etc.) should be selected based on the type of notification specified by the user (mode: admin or mode: team_member). Note: 'staff' in notification type names is a legacy term for team member.

Endpoint: POST /notification_settings/{location_id}/users/{user_id}
Version: 1.0.0
Security: BearerPartnerUser

## Path parameters:

  - `location_id` (number, required)
    location ID

  - `user_id` (number, required)
    User ID

## Header parameters:

  - `Accept` (string, required)
    application/vnd.api.v2+json

  - `Content-Type` (string, required)
    application/json

  - `Authorization` (string, required)
    Bearer bearer_token, User user_token

## Request fields (application/json):

  - `notification_types` (array)
    Array of objects
    Example: [{"type":"record_create_online_admin","channels":{"push":1}},{"type":"record_create_offline_admin","channels":{"push":1}},{"type":"record_delete_admin","channels":{"push":1}},{"type":"record_move_admin","channels":{"push":1}},{"type":"license_expire","channels":{"push":1}}]

  - `notification_types.type` (string)
    Notification type
    Enum: "record_create_online_staff", "record_create_offline_staff", "record_delete_staff", "record_move_staff", "record_create_online_admin", "record_create_offline_admin", "record_delete_admin", "record_move_admin", "license_expire"

  - `notification_types.channels` (object)
    The channel on which the notification will be sent

  - `notification_types.channels.push` (integer)
    PUSH notification

## Response 200 fields (application/json):

  - `success` (boolean)
    Execution success status
    Example: true

  - `data` (object)
    Object with data
    Example: {"mode":"staff","notification_types":[{"type":"record_create_online_staff","channels":{"push":1,"sms":0,"email":1}},{"type":"record_create_offline_staff","channels":{"push":1,"sms":0,"email":0}},{"type":"record_delete_staff","channels":{"push":0,"sms":0,"email":0}},{"type":"record_move_staff","channels":{"push":0,"sms":0,"email":0}},{"type":"license_expire","channels":{"push":0,"sms":0,"email":0}}]}

  - `data.mode` (string)
    Notification type (for team member/for administrator)
    Enum: "admin", "staff", "disabled"

  - `data.notification_types` (array)
    Example: [{"type":"record_create_online_staff","channels":{"push":1,"sms":0,"email":1}},{"type":"record_create_offline_staff","channels":{"push":1,"sms":0,"email":0}},{"type":"record_delete_staff","channels":{"push":0,"sms":0,"email":0}},{"type":"record_move_staff","channels":{"push":0,"sms":0,"email":0}},{"type":"license_expire","channels":{"push":0,"sms":0,"email":0}}]

  - `data.notification_types.type` (string)
    Notification type
    Enum: same as `notification_types.type` (9 values)

  - `data.notification_types.channels` (object)
    Channels through which notifications will be sent

  - `data.notification_types.channels.push` (integer)
    PUSH notifications

  - `data.notification_types.channels.sms` (integer)
    SMS notifications

  - `data.notification_types.channels.email` (integer)
    Email Notifications

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


