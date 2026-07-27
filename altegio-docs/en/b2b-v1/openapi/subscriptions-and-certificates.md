# Subscriptions & Certificates

Membership subscriptions and gift certificates

## Get Client Memberships

 - [GET /loyalty/abonements](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_client_memberships.md): Returns a list of client's memberships by phone

## Get User Memberships

 - [GET /user/loyalty/abonements](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_user_memberships.md): Returns a list of memberships of an authorized user

## Get a List of Memberships by Filter

 - [GET /chain/{chain_id}/loyalty/abonements](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_membership_list.md)

## Get a List of Membership Types by ID

 - [GET /company/{location_id}/loyalty/abonement_types/fetch](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_membership_type_list_by_id.md): A list of membership types available at a location can be obtained by querying the location ID and membership type IDs.

The list is an array of membership types.

### Get a list of membership types by ID

+ Parameters
    + company_id (required, number) - location ID
    + id: 1 (optional, number) - membership type ID (you can specify several additional parameters &ids[]={id}

## Get a List of Available Membership Types

 - [GET /company/{location_id}/loyalty/abonement_types/search](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_membership_type_list.md): A list of membership types available at a location can be obtained by requesting the location ID.
The list can be filtered by membership type name by passing the title parameter. Pagination is supported, specified by the page and page_size parameters.

The list is an array of membership types.


Membership type has the following structure:

| Field                          | Type    | Description                                                                                                          |
|-------------------------------|---------|----------------------------------------------------------------------------------------------------------------------|
| id                            | number  | Membership type identifier                                                                                           |
| title                         | string  | Membership type name                                                                                               |
| allow_freeze                  | boolean | Is it possible to freeze memberships? true - allowed, false - not allowed                                            |
| freeze limit                  | number  | Maximum total freezing period (days)                                                                                 |
| salon_group_id                | number  | Identifier of the chain in which the membership type is valid                                                        |
| period                        | number  | Membership expiration date (0 if not set)                                                                            |
| period_unit_id                | number  | Membership expiration unit (list of possible values, if not set - 0)                                               |
| is_allow_empty_code           | boolean | Allow the sale of a membership without a code? true - allow, false - do not allow                                    |
| is_united_balance             | boolean | Total or separate membership balance: true - total, false - separate                                                 |
| united_balance_services_count | number  | Number of visits for total balance                                                                                   |


Measurement units of membership type validity period

| Meaning | Description |
|---------|-------------|
| 1       | Day         |
| 2       | Week        |
| 3       | Month       |
| 4       | Year        |

## Search available subscriptions for event

 - [GET /api/v1/company/{location_id}/client/{client_id}/loyalty/abonements/search_for_activity](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/search_memberships_for_event.md): Retrieves subscriptions that can be used to create a client schedule for a series of events.

This method returns subscriptions (memberships) that:
- Belong to the specified client
- Are valid and active
- Can be applied to the specified activity
- Have remaining visits available

Use cases:
- Display available subscriptions when scheduling recurring activity sessions
- Check which subscriptions cover specific activity types
- Validate subscription applicability before creating schedules

Note: Returns subscriptions with their types and availability intervals.

## Check membership availability for event

 - [GET /api/v1/company/{location_id}/client/{client_id}/loyalty/abonements/{membership_id}/check_for_activity](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/check_memberships_for_event.md): Validates a specific subscription for creating activity schedules.

Returns:
- Last possible appointment date based on membership expiration
- Available visit count for the selected subscription
- Schedule day IDs that can be booked

Use cases:
- Validate subscription before creating recurring appointments
- Check if subscription has enough visits for schedule
- Determine last bookable date based on expiration
- Pre-validate schedule parameters

Note: Requires schedule_day_ids parameter to check specific dates.

## Get client gift cards

 - [GET /loyalty/certificates](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_client_gift_cards.md): Returns a list of client gift cards by phone

| Attribute         | Type      | Description                                                              |
|-------------------|-----------|---------------------------------------------------------------------------|
| id                | int       | Gift card ID                                                              |
| number            | string    | Gift card code                                                            |
| balance           | decimal   | Current balance                                                           |
| default_balance   | decimal   | Initial balance                                                           |
| type_id           | int       | Gift card type identifier                                                 |
| status_id         | int       | Status ID                                                                 |
| created_date      | timestamp | Date of sale                                                              |
| expiration_date   | datetime  | Burn date                                                                 |
| type              | object    | Object with gift card type information                                    |
| status            | object    | An object with information about the current gift card status             |

The type array contains the following objects:

| Attribute                | Type      | Description                                                                                                           |
|--------------------------|-----------|-----------------------------------------------------------------------------------------------------------------------|
| id                       | int       | Gift card type identifier                                                                                            |
| title                    | string    | Type name                                                                                                             |
| balance                  | decimal   | Gift card denomination                                                                                               |
| is_multi                 | boolean   | Is it available for multiple debits                                                                                  |
| company_group_id         | int       | ID of the chain where the certificate type was created                                                               |
| item_type_id             | int       | Restriction on the use of redemption points. 0 - no limit, 1 - services only, 2 - some services + all products, 3 - some services, 4 - products only |
| expiration_type_id       | int       | The ID of the expiration limit. 0 - unlimited, 1 - fixed date, 2 - fixed term                                        |
| expiration_date          | timestamp | Burn date of all gift cards. Populated with expiration_type_id = 1                                                  |
| expiration_timeout       | int       | Validity period of gift card. Populated with expiration_type_id = 2                                                 |
| expiration_timeout_unit_id | int     | Time units. 1 - Day, 2 - Week, 3 - Month, 4 - Year                                                                   |
| is_allow_empty_code      | boolean   | Sale without code                                                                                                    |
| item_type                | object    | Object with item_type_id and its name                                                                               |

## Get user gift cards

 - [GET /user/loyalty/certificates](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_user_gift_cards.md): Returns a list of authorized user gift cards

## Get a List of Gift Card Types by ID

 - [GET /company/{location_id}/loyalty/certificate_types/fetch](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_gift_card_type_list_by_id.md): A list of gift card types available at the location can be obtained by querying the location ID and gift card type IDs.

The list is an array of gift card types.

## Get a List of Available Gift Card Types

 - [GET /company/{location_id}/loyalty/certificate_types/search](https://developer.alteg.io/en/b2b-v1/openapi/subscriptions-and-certificates/get_gift_card_type_list.md): A list of gift card types available at a location can be obtained by querying the location ID.
The list can be filtered by the name of the gift card type by passing the title parameter.
Pagination is supported, specified by the page and page_size parameters.

The list is an array of gift card types.


Gift card type has the following structure:

| Field                      | Type    | Description                                                                                                                        |
|----------------------------|---------|------------------------------------------------------------------------------------------------------------------------------------|
| id                         | number  | Gift card type identifier                                                                                                          |
| title                      | string  | Gift card type name                                                                                                                |
| balance                    | number  | Gift card denomination                                                                                                           |
| is_multi                   | boolean | Write-off type: true - multiple write-off, false - single write-off                                                               |
| company_group_id           | number  | ID of the chain where the gift card type is valid                                                                                  |
| item_type_id               | number  | Application Constraint (list of possible values)                                                                                   |
| expiration_type_id         | number  | Expiration limit (list of possible values)                                                                                         |
| expiration_date            | string  | Fixed burn date in ISO8601 format (null if not set)                                                                                |
| expiration_timeout         | number  | Gift card validity period from the date of sale (0 if not set)                                                                     |
| expiration_timeout_unit_id | number  | The unit of measurement of the validity period of the gift card from the moment of sale (list of possible values, if not set - 0) |
| is_allow_empty_code        | boolean | Allow sale of gift card without code? true - allow, false - do not allow                                                           |


Gift Card Type Restriction

| Meaning | Description                     |
|---------|---------------------------------|
| 0       | Unlimited                       |
| 1       | Any services without products   |
| 2       | Any products without services   |
| 3       | Some services without products  |
| 4       | Some services and any products  |


Gift Card Type Expiration Limit

| Meaning | Description                            |
|---------|----------------------------------------|
| 0       | No expiration date                     |
| 1       | Fixed date for all instances           |
| 2       | Fixed period of validity from the date of sale |


Units of certificate type validity period

| Meaning | Description |
|---------|-------------|
| 1       | Day         |
| 2       | Week        |
| 3       | Month       |
| 4       | Year        |

