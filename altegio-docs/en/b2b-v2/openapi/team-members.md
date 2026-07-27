# Team Members

Team Member and position management.

Manage Team Member positions and retrieve Team Member information.


## List Team Members

 - [GET /locations/{location_id}/team_members](https://developer.alteg.io/en/b2b-v2/openapi/team-members/list_team_members.md): Retrieve Team Members for a Location as JSON:API resource objects.

Use the filters to select Team Members by name, Position, account link,
schedule, payment, dismissal, deletion, or assistant availability. Status
filters use 0, 1, and 2, where 2 disables that filter.

Related data can be requested by repeating the include parameter. The
employee wire value returns an employment profile that can contain
sensitive employment and identity data. Request and store it only when it
is necessary for the integration.

## List Positions

 - [GET /locations/{company_id}/positions](https://developer.alteg.io/en/b2b-v2/openapi/team-members/list_positions.md): Retrieve all Positions available to Team Members at a Location.

The response is a JSON:API collection and does not contain pagination
metadata. The literal company_id wire path parameter identifies a
Location.

## Create Position

 - [POST /locations/{company_id}/positions](https://developer.alteg.io/en/b2b-v2/openapi/team-members/create_position.md): Create a Position for Team Members at the specified Location.

## Get Position

 - [GET /locations/{company_id}/positions/{position_id}](https://developer.alteg.io/en/b2b-v2/openapi/team-members/get_position.md): Retrieve a Position by ID as a JSON:API resource object.

## Update Position

 - [PUT /locations/{company_id}/positions/{position_id}](https://developer.alteg.io/en/b2b-v2/openapi/team-members/update_position.md): Update a Position. The request must contain title.

## Delete Position

 - [DELETE /locations/{company_id}/positions/{position_id}](https://developer.alteg.io/en/b2b-v2/openapi/team-members/delete_position.md): Delete a Position.

