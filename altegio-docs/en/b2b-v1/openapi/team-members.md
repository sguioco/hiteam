# Team Members

Staff management including positions and scheduling

## Get list of team members

 - [GET /staff/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_team_member_list.md): Returns all team members for the specified location.

Each team member includes:
- Basic info (name, specialization, avatar)
- Rating and reviews data
- Schedule availability
- Position and status

## Add new team member

 - [POST /staff/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/deprecated_create_team_member.md)

## Get a specific team member

 - [GET /staff/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_team_member_by_id.md)

## Edit Team Member

 - [PUT /staff/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/update_team_member.md)

## Delete team member

 - [DELETE /staff/{location_id}/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/delete_team_member.md)

## Quick create a team member

 - [POST /company/{location_id}/staff/quick](https://developer.alteg.io/en/b2b-v1/openapi/team-members/create_team_member_quick.md): Creates a new team member with a minimal set of parameters.

## Get Team Members / Specific Team Member

 - [GET /company/{location_id}/staff/{team_member_id}](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_team_member.md)

## Deprecated. Get a list of location positions (deprecated)

 - [GET /company/{location_id}/staff/positions](https://developer.alteg.io/en/b2b-v1/openapi/team-members/get_position_list.md): This endpoint is deprecated. Use GET /v2/companies/{company_id}/positions instead.

The method allows you to get a list of current positions in the location.

Migration: The V2 Positions API provides enhanced functionality with full CRUD operations, pagination, and JSON:API format responses. See operation list_positions for details.

## Deprecated. Quick create a position (deprecated)

 - [POST /company/{location_id}/positions/quick](https://developer.alteg.io/en/b2b-v1/openapi/team-members/create_position_quick.md): This endpoint is deprecated. Use POST /v2/companies/{company_id}/positions instead.

Creates a new position in a location; position is created as a chain entity and at the same time linked to a location initiated its creation.

Migration: The V2 Positions API provides full CRUD operations with enhanced validation and JSON:API format responses. See operation create_position for details.

