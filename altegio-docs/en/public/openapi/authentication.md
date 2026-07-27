# Authentication

User authentication and verification endpoints for online booking

## Authorize Online Booking User

 - [POST /booking/auth](https://developer.alteg.io/en/public/openapi/authentication/authorize_online_booking_user.md): When a user of an online account changes their password, their API key will change and a new authorization will be required

| Attribute | Type | Description |
| ------------- | ------------- | ------------- |
| login | string | The visitor's phone number in the format +13155550175, or their email address. |
| password | string | Visitor password |

