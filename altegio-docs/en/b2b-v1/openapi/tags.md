# Tags

Label management for categorizing entities (deprecated, use v2)

## Create a Tag (Deprecated) (deprecated)

 - [POST /labels/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/tags/create_tag.md): Deprecated: Use POST /api/v2/companies/{company_id}/tags instead.

Creates a new tag for the specified location.

## Get location tags (Deprecated) (deprecated)

 - [GET /labels/{location_id}/{entity}](https://developer.alteg.io/en/b2b-v1/openapi/tags/get_tag_list_by_entity.md): Deprecated: Use GET /api/v2/companies/{company_id}/tags?entity={entity} instead.
Returns tags for the specified entity type.

The entity parameter accepts string aliases:
- common - common tags
- client - client tags
- record - appointment/record tags
- activity - activity/event tags

> Legacy support: Numeric values (0, 1, 2, 3) are also accepted but string aliases are preferred.

## Update Tag (Deprecated) (deprecated)

 - [PUT /labels/{location_id}/{tag_id}](https://developer.alteg.io/en/b2b-v1/openapi/tags/update_tag_by_tag_id.md): Deprecated: Use PUT /api/v2/companies/{company_id}/tags/{tag_id} instead.

## Delete location tag (Deprecated) (deprecated)

 - [DELETE /labels/{location_id}/{tag_id}](https://developer.alteg.io/en/b2b-v1/openapi/tags/delete_tag_by_tag_id.md): Deprecated: Use DELETE /api/v2/companies/{company_id}/tags/{tag_id} instead.

