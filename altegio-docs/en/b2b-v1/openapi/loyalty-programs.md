# Loyalty Programs

Discount programs, referral programs, and loyalty transactions

## Get a List of Promotions Active in the Location

 - [GET /company/{location_id}/loyalty/programs/search](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/get_location_loyalty_program_list.md): The method allows you to get a list of promotions that are active for the specified location.

## Get loyalty transactions by visit

 - [GET /visit/loyalty/transactions/{visit_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/get_loyalty_transactions_by_visit.md): List of transactions for loyalty promotions for this visit

## Gift Card/Membership Code Generation

 - [GET /loyalty/generate_code/{location_id}/{product_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/generate_loyalty_code.md): + Options
    + location_id (required, number, 1) - location ID
    + product_id (required, number, 1) - product ID (gift card/ membership)

## Apply Deduction from the Loyalty Card in the Visit

 - [POST /visit/loyalty/apply_card_withdrawal/{location_id}/{card_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/apply_loyalty_card_deduction.md): The amount deducted will not exceed the available bonus balance. If the value is set to 0, no write-off transaction will occur

## Cancel Withdrawal from the Loyalty Card During the Visit

 - [POST /visit/loyalty/cancel_card_withdrawal/{location_id}/{card_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/cancel_loyalty_card_withdrawal.md): Cancellation of write-off from the loyalty card.

## Apply a Discount Promotion in a Visit

 - [POST /visit/loyalty/apply_discount_program/{location_id}/{card_id}/{program_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/apply_discount_promotion.md): Applying a promotion to a visit, it only makes sense if there is a visit

## Cancel the Application of the Discount Promotion in the Visit

 - [POST /visit/loyalty/cancel_discount_program/{location_id}/{card_id}/{program_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/cancel_discount_promotion.md): Cancellation of the promotion applied to the visit.

## Apply Referral Program During a Visit

 - [POST /visit/loyalty/apply_referral_program/{location_id}/{chain_id}](https://developer.alteg.io/en/b2b-v1/openapi/loyalty-programs/apply_referral_program.md): Applying a referral program to a visit

