# Users & Permissions

User account management and role-based access control

## Get location users

 - [GET /company/{location_id}/users](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_location_users.md): The method allows you to get users of the location.  
 location User object:

| Attribute  | Type | Description |
| ------------- | ------------- | ------------- |
|  id  |  number   | User ID   |
|  name  | string  | User name  |
|  phone  | string  | User phone |
| email  | string  | User email |
| information  | string  | User information |
|  is_approved  |  boolean | Whether the user accepted the invitation to manage the location  |
|  is_non_deletable  |  boolean  | Whether the user is non-deletable

## Remove the user from the location

 - [DELETE /company/{location_id}/users/{user_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/remove_user_from_location.md)

## Get a list of rights

 - [GET /user/permissions/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_permission_list.md): + Parameter
    + company_id (required, number, 1) - location ID

## Getting a list of user roles

 - [GET /company/{location_id}/users/roles](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/list_roles.md): Returns a list of user roles along with permissions for each role.

## Getting a list of user roles in the context of a location user

 - [GET /company/{location_id}/users/{user_id}/roles](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_user_roles.md): Returns a list of user roles along with permissions for each role. Allows to get the editable status for each permission of a location user (is_editable field). This status depends on the current user's permissions.

## Getting permission values and user role

 - [GET /company/{location_id}/users/{user_id}/permissions](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/get_user_permissions.md): Return user role and list of permissions values.

## Updating permission values and user role

 - [PUT /company/{location_id}/users/{user_id}/permissions](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/update_user_permissions.md): Updates the role and permissions of the user, as well as the team member who is attached to this user.

## Create and Send an Invitation

 - [POST /user/invite/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/create_user_invitation.md): An invitation to manage a location is sent via email or phone as a link. By following the link and completing registration, the user gains access to manage the location according to the permissions assigned.
Permission assignment is performed in a separate request after the invitation is sent.

## Copy a User to Companies

 - [POST /company/{location_id}/users/{user_id}/copy_to_companies](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/copy_user_permissions_to_locations.md): Copies an active user and their permissions to multiple locations at once. If the user does not yet exist in a location, they will be added as an active user. If the user has already been invited to the location, only their permissions will be updated — however, they will still need to accept the invitation.

## Removing a User from Companies

 - [POST /company/{location_id}/users/{user_id}/remove_from_companies](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/remove_user_from_locations.md): Removes an active user from multiple companies at once.

## Deprecated. Get location users (deprecated)

 - [GET /company_users/{location_id}](https://developer.alteg.io/en/b2b-v1/openapi/users-and-permissions/deprecated_get_location_users.md): location User object

