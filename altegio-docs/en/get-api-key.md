# How to Get API Keys

Your API key (also called **bearer token** or **partner token**) is your authentication credential for making API requests. Here's how to get it.

## Step 1: Register in Marketplace

Head over to the [Marketplace registration page](https://app.alteg.io/appstore/developers/1) and sign up.

**Two scenarios:**

- **Building an integration for a client?** Ask them to invite you to their location (they'll need your phone number or email).
- **Building your own app/product?** Register on [alteg.io](https://alteg.io/en) — fill in your service name in the "Location name" field, and a Partner Program manager will reach out.


## Step 2: Get Your API Key

Once registered, your API key appears automatically in the **Account settings** section of the Marketplace. No need to generate it manually — it's there right after signup.

![Account settings section showing API key](/assets/api-key-account-settings.4613dfe027019e92f527a3c642d5a51ddf440d38cbb816220a588102de39d10a.67248175.png)

Copy this token and use it in your API requests as the bearer token:

```bash
Authorization: Bearer <your-api-key>
```

## Step 3: Get User Token (if needed)

Most endpoints require only the bearer token. But for endpoints that access business data (like appointments, clients, transactions), you'll also need a **user token**.

Get the user token by calling the [authentication endpoint](/en/b2b-v1/openapi#tag/Authentication-B2B/operation/auth) with your user credentials. The response includes the user token.

Then use both tokens in your requests:

```bash
Authorization: Bearer <partner-token>, User <user-token>
```

## Need Help?

Stuck? Email us at **[api@alteg.io](mailto:api@alteg.io)** with:

- A screenshot from Postman showing: **URL**, **Method**, **Headers**, and **Response**
- The **request body** (as JSON or text)
- Both tokens separately (don't paste them in the screenshot)


## Quick Links

- [Marketplace Registration](https://app.alteg.io/appstore/developers/1)
- [API Documentation](/en/)
- [Online Booking & Client Personal Cabinet v1](/en/public/openapi)
- [Scheduling, POS & Administrative v1](/en/b2b-v1/openapi)
- [Scheduling, POS & Administrative v2](/en/b2b-v2/openapi)
- [Developer Tools v1](/en/developers/openapi)
- [API License Agreement](/en/api-license-agreement)