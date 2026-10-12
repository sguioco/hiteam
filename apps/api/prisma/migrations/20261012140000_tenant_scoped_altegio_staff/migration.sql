-- Disconnected workspaces keep their history. Reconnecting the same Altegio
-- location to a new workspace must not collide with historical staff links.
-- Duplicate links remain forbidden within each workspace.
CREATE UNIQUE INDEX "Employee_tenantId_altegioTeamMemberId_key"
ON "Employee"("tenantId", "altegioTeamMemberId");

DROP INDEX "Employee_altegioTeamMemberId_key";
