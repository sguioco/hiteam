# Services

Service catalog management including categories and team member assignments

## Create a service category

 - [POST /service_categories/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/create_service_category.md)

## Get a list of services

 - [GET /services/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service_list.md): Returns a list of all services for the specified location

## Create a service

 - [POST /services/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/create_service.md): Method to create a service

## Update a service

 - [PUT /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/deprecated_update_service_by_id.md): Method to update a service by ID

## Update a service (partial)

 - [PATCH /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/patch_service.md): Method to partially update a service

## Delete a service

 - [DELETE /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/delete_service.md): Method to remove a service

## Get service category

 - [GET /service_category/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service_category.md)

## Change service category

 - [PUT /service_category/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/update_service_category.md)

## Delete service category

 - [DELETE /service_category/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/delete_service_category.md)

## Get a list of service categories

 - [GET /company/{location_id}/service_categories/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service_category_list.md): + Options
    + company_id (required, number) - location ID
    + id (optional, number) - service category ID (to work with a specific category)
    + staff_id (optional, number) - team member ID (to get categories associated with a team member)

## Get a list of services / specific service

 - [GET /company/{location_id}/services/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/get_service.md): + Parameter
    + company_id (required, number, 1) - location ID
    + service_id (optional, number, 1) - service ID

## Linking a Team Member to a Provided Service

 - [POST /company/{location_id}/services/{service_id}/staff](https://developer.alteg.io/en/b2b-v1/openapi/services/assign_service_to_team_member.md): Creates a team member service link with provided duration and bill of materials.

## Updating Team Member Service Link Settings

 - [PUT /company/{location_id}/services/{service_id}/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/update_service_team_member_assignment.md): Updates a team member service link with provided duration and bill of materials.

## Deleting a Team Member Service Link

 - [DELETE /company/{location_id}/services/{service_id}/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/remove_service_from_team_member.md): Deletes a team member service link.

## Update service links

 - [POST /company/{location_id}/services/links](https://developer.alteg.io/en/b2b-v1/openapi/services/update_service_links.md): Updates service configuration including:
- Team member assignments with custom duration and pricing
- Tech cards (technological cards) for each team member
- Required resources for the service
- Service name translations for different languages

This endpoint allows bulk updating of service-team member relationships
without affecting other service properties.

## Get a list of chain service categories

 - [GET /chain/{chain_id}/service_categories](https://developer.alteg.io/en/b2b-v1/openapi/services/get_chain_service_category_list.md)

## Deprecated. Get a list of service categories (deprecated)

 - [GET /service_categories/{location_id}/{id}](https://developer.alteg.io/en/b2b-v1/openapi/services/deprecated_get_service_category_list.md): Get a list of service categories

## Deprecated. Get a list of services / specific service (deprecated)

 - [GET /services/{location_id}/{service_id}](https://developer.alteg.io/en/b2b-v1/openapi/services/deprecated_get_service_list_by_id.md)

