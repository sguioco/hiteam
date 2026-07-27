# Loyalty Cards

Loyalty card types, issuance, and manual transactions

## Get a List of Customer Cards by ID

 - [GET /loyalty/client_cards/{client_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_list_by_client_id.md): Returns a list of customer cards with programs that are active in this location

The attributes in the response to the request completely match the "Get a list of issued cards by phone number" method described above

## Get a List of Customer Cards by Phone Number

 - [GET /loyalty/cards/{phone}/{chain_id}/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_list_by_phone.md): Returns a list of customer cards with programs that are active in this location

| Attribute        | Type    | Description                                                                                   |
|------------------|---------|-----------------------------------------------------------------------------------------------|
| id               | int     | Loyalty card ID                                                                               |
| balance          | decimal | Loyalty card balance                                                                          |
| paid_amount      | decimal | Amount "Paid"                                                                                 |
| sold_amount      | decimal | Amount "Sold"                                                                                |
| visits_count     | int     | Number of visits                                                                              |
| number           | string  | Card number                                                                                   |
| type_id          | int     | Loyalty card type identifier                                                                  |
| salon_group_id   | int     | ID of the chain where the card was created                                                    |
| type             | object  | Object that contains the "id" and "title" fields: card type identifier and name             |
| salon_group      | object  | Object that contains the "id" and "title" fields: identifier of the chain where the card type was created and the name of this chain |
| programs         | array   | Array with information about promotions linked to a loyalty card                              |
| rules            | array   | Array with information about the rules configured in the action                               |

The programs array consists of objects with the following fields:

| Attribute         | Type    | Description                                   |
|-------------------|---------|-----------------------------------------------|
| id                | int     | Promotion ID                                  |
| title             | string  | Action name                                   |
| loyalty_type_id   | int     | Promotion type ID                             |
| item_type_id      | int     | Is cashback accrued from products             |
| value_unit_id     | int     | Bonus field — Discount % or Fixed amount      |
| group_id          | int     | ID of the chain where the action was created  |
| loyalty_type      | object  | Object with information about the action      |

The rules array consists of objects with the following fields:

| Attribute           | Type    | Description                                                  |
|---------------------|---------|--------------------------------------------------------------|
| id                  | int     | Rule ID                                                      |
| loyalty_program_id  | int     | Identifier of the promotion to which the rule is attached    |
| loyalty_type_id     | int     | Promotion type ID                                            |
| value               | decimal | Value from which the rule will work                          |

## Get User Loyalty Cards

 - [GET /user/loyalty_cards/{chain_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_user_loyalty_cards.md): Returns a list of cards of an authorized user with programs, filtering cards by location chain / location

## Get a list of card types available at the location

 - [GET /loyalty/card_types/salon/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_type_list.md): Returns a list of card types that are valid for the given location.

The attributes and their descriptions match those defined in the "Collection of Card Types Available to the Client" method described above.

## Get a List of Card Types Available for Issuance to the Client

 - [GET /loyalty/card_types/client/{location_id}/{phone}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_loyalty_card_type_list_for_client.md): Returns a list of card types that are available for issuance to a location client.

| Attribute        | Type    | Description                                                                                   |
|------------------|---------|-----------------------------------------------------------------------------------------------|
| id               | int     | Card type identifier                                                                          |
| title            | string  | Card type name                                                                                 |
| salon_group_id   | int     | ID of the chain where the card type was created                                                |
| salon_group      | object  | An object that contains the "id" and "title" fields: identifier of the chain where the card type was created and the name of this chain |

## Get a List of Card Types Available at the Chain

 - [GET /chain/{chain_id}/loyalty/card_types](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/get_chain_loyalty_card_type_list.md)

## Issue a Loyalty Card

 - [POST /loyalty/cards/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/issue_loyalty_card.md): | Attribute | Type | Description |
|----------------------|--------|----------------- ------------------------------|
| loyalty_card_number | number | Loyalty card number |
| loyalty_card_type_id | number | Loyalty card type identifier |
| phone | number | Customer phone number (e.g., 13155550175 for +13155550175) |

## Remove a Loyalty Card

 - [DELETE /loyalty/cards/{location_id}/{card_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/remove_loyalty_card.md)

## Manual withdraw/deposit to loyalty card in location

 - [POST /company/{location_id}/loyalty/cards/{card_id}/manual_transaction](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/create_loyalty_card_transaction.md): Manual withdraw/deposit to loyalty card in location

## Manual withdraw/deposit to loyalty card in chain

 - [POST /chain/{chain_id}/loyalty/cards/{card_id}/manual_transaction](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-cards/create_chain_loyalty_card_transaction.md): Manual withdraw/deposit to loyalty card in chain

