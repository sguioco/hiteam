# Authentication B2B

User authentication and session management for B2B integrations

## Authorize User

 - [POST /auth](https://developer.alteg.io/en/b2b-v1/openapi/authentication-b2b/authorize_user.md): When a user changes their password, their API key is regenerated. As a result, reauthorization is required using the new API key.

| Attribute | Type | Description |
| ------------- | ------------- | ------------- |
| login | string | The user's phone number in the format +13155550175, or their email address.|
| password | string | User password |

