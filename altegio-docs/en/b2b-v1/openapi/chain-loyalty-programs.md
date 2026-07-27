# Chain Loyalty Programs

Chain-level loyalty programs and transactions

## Freeze membership

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/freeze](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_freeze.md): Freezes a subscription (membership) until the specified date.

The subscription's expiration date will be extended by the freeze period.
Frozen subscriptions cannot be used for appointments.

Requirements:
- Membership type must have allow_freeze: true
- Freeze period must not exceed freeze_limit from membership type

Note: Requires chain-level permissions.

## Unfreeze membership

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/unfreeze](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_unfreeze.md): Removes the freeze from a subscription (membership).

The subscription's expiration date will remain extended by the freeze period
that was already applied during the freeze.

Note: Requires chain-level permissions.

## Change membership balance

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/set_balance](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_set_balance.md): Modifies the remaining visit count for a subscription (membership).

For unified balance subscriptions:
- Use united_balance_services_count to set total visits

For separate balance subscriptions:
- Use services_balance_count array with service_id and balance for each service/category

Use cases:
- Adjust balance after administrative changes
- Correct errors in visit counts
- Add bonus visits

Note: Requires chain-level permissions.

## Change membership validity period

 - [POST /chain/{chain_id}/loyalty/abonements/{membership_id}/set_period](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_memberships_set_period.md): Modifies the validity period (duration) of a subscription (membership).

This changes how long the subscription remains active before expiring.

Period units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

Use cases:
- Extend expiration as customer service gesture
- Adjust period after policy changes
- Correct administrative errors

Note: Requires chain-level permissions.

## List membership types

 - [GET /chain/{chain_id}/loyalty/abonement_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_list.md): Retrieves all membership types available in the chain.

Note: Requires chain-level permissions.

## Create membership type

 - [POST /chain/{chain_id}/loyalty/abonement_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_create.md): Creates a new membership type at the chain level. Membership types define reusable packages
(e.g., "10 visits", "Monthly unlimited") that can be sold across multiple locations in the chain.

Important API Differences:
- services and service_categories must be objects (key-value pairs), not arrays
- Example: {"service_id": count} not [service_id]
- Some legacy documentation shows arrays, but the real API requires objects

Note: Requires chain-level permissions.

## Get membership type details

 - [GET /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_read.md): Retrieves detailed information about a specific membership type.

Note: Requires chain-level permissions.

## Update membership type

 - [PUT /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_update.md): Updates an existing membership type. You can update basic information
(title, cost, period) without modifying the service/category links.

Note: To preserve existing services, pass empty arrays for
services and service_categories fields.

## Delete membership type

 - [DELETE /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_delete.md): Deletes a membership type from the chain.

Warning: This action cannot be undone. Active subscriptions using this type
may be affected.

## Clone membership type

 - [POST /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}/clone](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_clone.md): Creates a copy of an existing membership type with a new ID.

The cloned membership type will:
- Have the same settings (cost, period, services, etc.)
- Get a modified title with " (2)" suffix automatically added
- Have a new unique ID
- Preserve all service/category links from the original

Note: Requires chain-level permissions.

## Restore deleted membership type

 - [POST /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}/restore](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_restore.md): Restores a previously deleted membership type.

Note: Requires chain-level permissions.

## Archive or unarchive membership type

 - [PATCH /chain/{chain_id}/loyalty/abonement_types/{loyalty_membership_type_id}/archive](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_membership_types_archive.md): Archives or unarchives a membership type.

Archived membership types:
- Cannot be sold to new clients
- Existing active memberships remain functional
- Can be unarchived at any time

Note: Requires chain-level permissions.

## List certificate types

 - [GET /chain/{chain_id}/loyalty/certificate_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_list.md): Retrieves a list of certificate types at the chain level.

Returns all certificate types configured for the chain with optional filtering
and pagination.

Query Parameters:
- title - Filter by certificate type name (partial match)
- page - Page number (default: 1)
- page_size - Items per page (default: 10, max: 100)

Item Type Restrictions:
- 0 = All services and products
- 1 = Any services (no products)
- 2 = Any products (no services)
- 3 = Specific services only (no products)
- 4 = Specific services + any products

Expiration Types:
- 0 = No expiration
- 1 = Fixed date for all instances
- 2 = Fixed period from sale date

Expiration Units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

## Create certificate type

 - [POST /chain/{chain_id}/loyalty/certificate_types](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_create.md): Creates a new certificate type at the chain level.

Certificate types define gift certificate templates that can be sold across multiple locations.

Item Type Restrictions:
- 0 = All services and products
- 1 = Any services (no products)
- 2 = Any products (no services)
- 3 = Specific services only (no products)
- 4 = Specific services + any products

Expiration Types:
- 0 = No expiration
- 1 = Fixed date for all instances
- 2 = Fixed period from sale date

Expiration Units:
- 1 = day
- 2 = week
- 3 = month
- 4 = year

Balance Edit Types:
- 1 = Can be edited
- 2 = Cannot be edited

Note: After creation, certificate products are automatically created in inventory.

## Get certificate type

 - [GET /chain/{chain_id}/loyalty/certificate_types/{type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_get.md): Retrieves a specific certificate type by ID at the chain level.

Returns complete certificate type configuration including expiration rules,
restrictions, and online sale settings.

## Update certificate type

 - [PUT /chain/{chain_id}/loyalty/certificate_types/{type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_update.md): Updates an existing certificate type at the chain level.

All fields from creation are required. Use GET first to retrieve current values,
then modify needed fields and send complete object.

Note: Cannot update certificate types that have already been issued.

## Delete certificate type

 - [DELETE /chain/{chain_id}/loyalty/certificate_types/{type_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/chain_loyalty_certificate_types_delete.md): Deletes a certificate type from the chain.

Warning: This action cannot be undone. Certificate types that have
issued certificates cannot be deleted.

## Create a Chain Promotion

 - [POST /chain/{chain_id}/loyalty/programs](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/create_chain_loyalty_program.md)

## Get a Chain Promotion

 - [GET /chain/{chain_id}/loyalty/programs/{loyalty_program_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/get_chain_loyalty_program.md)

## Edit Chain Promotion

 - [PUT /chain/{chain_id}/loyalty/programs/{loyalty_program_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/update_chain_loyalty_program.md)

## Delete Chain Promotion

 - [DELETE /chain/{chain_id}/loyalty/programs/{loyalty_program_id}](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/delete_chain_loyalty_program.md)

## Get a List of Chain Loyalty Transactions

 - [GET /chain/{chain_id}/loyalty/transactions](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/get_chain_loyalty_transaction_list.md)

## Get a list of loyalty notification templates

 - [GET /chain/{chain_id}/loyalty/notification_message_templates/programs](https://developer.alteg.io/en/b2b-v1/openapi/chain-loyalty-programs/get_chain_loyalty_notification_template_list.md)

