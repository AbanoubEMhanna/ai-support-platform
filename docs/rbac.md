# RBAC

Roles live on `Membership.role` and propagate into the JWT as `role`. There are three:

| Role     | Meaning                                                     |
| -------- | ----------------------------------------------------------- |
| `OWNER`  | Created the org, full control.                              |
| `ADMIN`  | Org-level management; same as OWNER except cannot transfer. |
| `MEMBER` | Read + create their own resources.                          |

## Enforcement

`RolesGuard` reads the `@Roles(...)` metadata from the route handler/class and checks `req.user.role`. It must be paired with `AuthGuard('jwt')` and (for org-scoped routes) `OrgGuard`.

```ts
@UseGuards(AuthGuard('jwt'), OrgGuard, RolesGuard)
@Roles('OWNER', 'ADMIN')
```

If `@Roles` is omitted on a route, it falls through unrestricted (still subject to the auth + org guards).

## Policy

| Method | Path                          | Required role     |
| ------ | ----------------------------- | ----------------- |
| POST   | `/auth/*`                     | public / cookie   |
| GET    | `/auth/me`, `/me`             | any authenticated |
| GET    | `/organizations`              | any authenticated |
| POST   | `/organizations`              | any authenticated |
| POST   | `/organizations/:id/switch`   | membership exists |
| GET    | `/documents`                  | MEMBER+           |
| POST   | `/documents/upload`           | MEMBER+           |
| GET    | `/chat/conversations*`        | MEMBER+           |
| POST   | `/chat`                       | MEMBER+           |
| GET    | `/tickets`                    | MEMBER+           |
| POST   | `/tickets`                    | MEMBER+           |
| PATCH  | `/tickets/:id/status`         | **OWNER, ADMIN**  |

## Future role-gated routes

When member management lands (`POST /organizations/:id/members`, `DELETE /organizations/:id/members/:userId`, role mutation), gate them as:

| Method | Path                                    | Required role |
| ------ | --------------------------------------- | ------------- |
| POST   | `/organizations/:id/members`            | OWNER, ADMIN  |
| DELETE | `/organizations/:id/members/:userId`    | OWNER         |
| PATCH  | `/organizations/:id/members/:userId/role` | OWNER       |
