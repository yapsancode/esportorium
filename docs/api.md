# API Endpoints

## Tournaments (public)
```
GET    /api/tournaments              # list all approved tournaments (filter: status, state)
GET    /api/tournaments/:id          # single tournament detail
POST   /api/tournaments/submit       # organiser submission (creates unapproved record)
```

## Admin (protected)
```
GET    /api/admin/tournaments        # all tournaments including unapproved
GET    /api/admin/submissions        # pending submissions only
PATCH  /api/admin/tournaments/:id/approve
PATCH  /api/admin/tournaments/:id/reject
POST   /api/admin/tournaments        # manually add tournament
PUT    /api/admin/tournaments/:id    # edit tournament
DELETE /api/admin/tournaments/:id    # delete tournament
POST   /api/admin/auth/login         # admin login
```

## Organiser (protected — organiser JWT, V2)
```
POST   /api/organiser/auth/signup           # email + password + display_name + contact
POST   /api/organiser/auth/login            # returns organiser JWT
GET    /api/organiser/tournaments           # ONLY this organiser's rows (tenant-scoped)
POST   /api/organiser/tournaments           # create draft (unapproved); organiser_id from JWT, body ignored
GET    /api/organiser/tournaments/:id       # ownership-checked; 404 (not 403) on mismatch
PATCH  /api/organiser/tournaments/:id       # ownership-checked
DELETE /api/organiser/tournaments/:id       # ownership-checked
POST   /api/organiser/ingest                # agentic ingest: text/image/PDF -> structured draft
GET    /api/organiser/claim/preview?token=  # UNAUTH: resolve a claim token -> {title, already_claimed}
POST   /api/organiser/claim                 # authed: bind an ownerless tournament to caller (claim_token in body)
```

## File Upload
```
POST   /api/upload/banner            # upload image to R2, returns public URL
```
