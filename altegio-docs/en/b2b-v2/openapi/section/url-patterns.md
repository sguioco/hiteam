## URL Patterns

Location-scoped resources use `/locations/{location_id}/...`.

Positions and Tags preserve the literal `company_id` path parameter name for
SDK compatibility, but its value is the Location identifier. The legacy
`/companies/{company_id}/positions` and `/companies/{company_id}/tags` paths
remain accepted as compatibility aliases.