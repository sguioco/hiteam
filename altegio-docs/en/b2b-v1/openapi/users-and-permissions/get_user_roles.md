# Getting a list of user roles in the context of a location user

Returns a list of user roles along with permissions for each role. Allows to get the editable status for each permission of a location user (is_editable field). This status depends on the current user's permissions.

Endpoint: GET /company/{location_id}/users/{user_id}/roles
Version: 1.0.0
Security: BearerPartnerUser

## Header parameters:

  - `Accept` (string, required)
    Required B2B v2 response media type. Use application/vnd.api.v2+json. A charset parameter is also accepted.
    Example: "application/vnd.api.v2+json"

  - `Content-Type` (string, required)
    Should be equal to application/json
    Example: "application/json"

## Path parameters:

  - `location_id` (number, required)
    ID of a location.
    Example: 123

  - `user_id` (number, required)
    ID of a user.
    Example: 123

## Query parameters:

  - `include` (array)
    Requested set of an included models.
    Enum: "user_permissions"

## Response 200 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (array)
    Example: [{"slug":"staff_member","title":"team member","description":"Provides services","weight":1,"user_permissions":[{"slug":"timetable_access","title":"Appointment calendar","hint":"","is_recommended":true,"is_editable":true,"default_value":true,"entity_name":null,"children":[{"slug":"timetable_position_id","title":"View the schedule and post records","hint":"","is_recommended":true,"is_editable":true,"default_value":null,"entity_name":"position","children":null,"options":[{"title":"All positions","value":0,"is_disabled":false},{"title":"Administrator","value":1234,"is_disabled":false}],"type":{"slug":"allowed_id","all_access_value":"0","no_access_value":"0"}}],"options":null,"type":{"slug":"has_group_access","all_access_value":true,"no_access_value":false}}]}]

  - `data.slug` (string)
    Name of the role
    Enum: "worker", "administrator", "accountant", "manager", "owner", "free_readonly", "free_readonly_admin"

  - `data.title` (string)
    Title of the role
    Example: "team member"

  - `data.description` (string)
    Description of the role
    Example: "Provides services"

  - `data.weight` (number)
    Role weight which determines the number of available permissions
    Example: 1

  - `data.user_permissions` (array,null)
    List of permissions for this role
Returned in response only if corresponding include is present in request.
    Example: [{"slug":"timetable_access","title":"Appointment calendar","hint":"","is_recommended":true,"is_editable":true,"default_value":true,"entity_name":null,"children":[{"slug":"timetable_position_id","title":"View the schedule and post records","hint":"","is_recommended":true,"is_editable":true,"default_value":null,"entity_name":"position","children":null,"options":[{"title":"All positions","value":0,"is_disabled":false},{"title":"Administrator","value":1234,"is_disabled":false}],"type":{"slug":"allowed_id","all_access_value":"0","no_access_value":"0"}}],"options":null,"type":{"slug":"has_group_access","all_access_value":true,"no_access_value":false}}]

  - `data.user_permissions.slug` (string)
    Name of the permission
    Example: "timetable_access"

  - `data.user_permissions.title` (string)
    Title of the permission
    Example: "Appointment calendar"

  - `data.user_permissions.type` (object)
    Data about the type of permission
    Example: {"slug":"has_group_access","all_access_value":true,"no_access_value":false}

  - `data.user_permissions.type.slug` (string)
    Name of the type
    Enum: "has_access", "has_group_access", "has_limited_access", "has_allowed_ids", "has_limited_today", "has_limited_by_own_access", "last_days_count", "allowed_ids", "allowed_id", "allowed_ip"

  - `data.user_permissions.type.all_access_value` (string,null)
    A value that grants full access for this type of permission (can be number, string, or boolean)
    Example: true

  - `data.user_permissions.type.no_access_value` (string,null)
    A value that completely takes away access for this type of permission (can be number, string, or boolean)

  - `data.user_permissions.options` (array,null)
    Options list of the permission
    Example: [{"title":"All positions","value":0,"is_disabled":false}]

  - `data.user_permissions.options.title` (string)
    Title of the option
    Example: "All positions"

  - `data.user_permissions.options.value` (number)
    Value of the option

  - `data.user_permissions.options.is_disabled` (boolean)
    Availability of the option for use

  - `data.user_permissions.hint` (string)
    Text hint on the use of the permission

  - `data.user_permissions.is_recommended` (boolean)
    Is the permission recommended or optional
    Example: true

  - `data.user_permissions.is_editable` (boolean)
    Is the permission available for editing
    Example: true

  - `data.user_permissions.default_value` (string,null)
    Value of the permission by default (can be number, string, or boolean)
    Example: true

  - `data.user_permissions.entity_name` (string,null)
    The name of the entity to which this permission belongs

  - `data.user_permissions.is_paid` (boolean)
    Whether the permission is only available for paid staff members

  - `data.user_permissions.is_paid_only` (boolean)
    Whether the permission can only be assigned to paid staff members. Only applicable when the location has is_paid_rights_model enabled

  - `data.user_permissions.children` (array,null)
    Nested permissions (recursive structure, same schema as parent)
    Example: [{"slug":"timetable_position_id","title":"View the schedule and post records","hint":"","is_recommended":true,"is_editable":true,"default_value":null,"entity_name":"position","children":null,"options":[{"title":"All positions","value":0,"is_disabled":false},{"title":"Administrator","value":1234,"is_disabled":false}],"type":{"slug":"allowed_id","all_access_value":"0","no_access_value":"0"}}]

  - `meta` (object,array)
    Additional response data (empty object or empty array)

## Response 401 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Authentication needed."

## Response 403 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object)
    Additional response data.

  - `meta.message` (string)
    Error message.
    Example: "Access denied."

## Response 404 fields (application/json):

  - `success` (boolean)
    Response status.

  - `data` (object,null)
    Response data.

  - `meta` (object,array)
    Additional response data (empty object or empty array)


