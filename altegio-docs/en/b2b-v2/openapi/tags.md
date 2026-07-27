# Tags

Booking User tagging system.

## List Tags

 - [GET /locations/{company_id}/tags](https://developer.alteg.io/en/b2b-v2/openapi/tags/list_tags.md): Returns all Tags for the specified Location, optionally filtered by entity type.

Response uses JSON:API format where type: "tag" is the resource type name (not to be confused with entity_type attribute).

Entity types:
- common (0) - General tags
- client (1) - Booking User Tags
- record (2) - Appointment Tags
- activity (3) - Event Tags

Use the entity query parameter to filter by type. Accepts both string aliases and numeric values.

## Create Tag

 - [POST /locations/{company_id}/tags](https://developer.alteg.io/en/b2b-v2/openapi/tags/create_tag.md): Creates a new Tag for the specified Location.

## Get Tag

 - [GET /locations/{company_id}/tags/{tag_id}](https://developer.alteg.io/en/b2b-v2/openapi/tags/get_tag.md): Returns detailed information about a specific Tag.

Response uses JSON:API format where type: "tag" is the resource type name.

## Update Tag

 - [PUT /locations/{company_id}/tags/{tag_id}](https://developer.alteg.io/en/b2b-v2/openapi/tags/update_tag.md): Updates an existing Tag.

## Delete Tag

 - [DELETE /locations/{company_id}/tags/{tag_id}](https://developer.alteg.io/en/b2b-v2/openapi/tags/delete_tag.md): Deletes a Tag by marking it as deleted.

