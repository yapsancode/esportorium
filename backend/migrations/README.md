# Legacy manual migrations

`0001` and `0002` in this folder were run by hand directly against Supabase
before Alembic was wired up. They're kept here only as a historical record —
the live schema they describe is now the Alembic baseline
(`backend/alembic/versions/..._baseline_adopt_alembic.py`).

Going forward, all schema changes go through Alembic:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
# review the generated file in alembic/versions/ before applying
alembic upgrade head
```

Don't add new `.sql` files here.
