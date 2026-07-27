# Utilities

License info, phone validation, images, and tips

## Retrieve location subscription information

 - [GET /license/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/get_location_subscription_information.md)

## Phone number format check

 - [GET /validation/validate_phone/{phone}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/phone_number_format_check.md): The transferred phone number is checked for compliance with Altegio rules.

## Image upload

 - [POST /images/{entity}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/upload_image.md): The response object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| image_binded | boolean | Status of linking images to an entity |
| image_group | object | Image group object |

## Deleting images

 - [DELETE /images/{entity}](https://developer.alteg.io/en/b2b-v1/openapi/utilities/delete_image.md): The response object has the following fields:

| Field | Type | Description |
| ------------- | ------------- | ------------- |
| success | boolean | Deletion result |

## Get a list of location team members with their tip settings

 - [GET /tips/{location_id}/settings](https://developer.alteg.io/en/b2b-v1/openapi/utilities/get_team_member_tip_settings.md)

## Disable Tips for the team member

 - [POST /tips/{location_id}/settings/{master_tips_settings_id}/disable](https://developer.alteg.io/en/b2b-v1/openapi/utilities/disable_team_member_tips.md)

## Enable Tips for the team member

 - [GET /tips/{location_id}/settings/{master_tips_settings_id}/enable](https://developer.alteg.io/en/b2b-v1/openapi/utilities/enable_team_member_tips.md)

