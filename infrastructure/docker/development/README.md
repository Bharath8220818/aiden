# development

No overrides needed — the root `docker-compose.yml` **is** the development
stack (dev-safe secrets, exposed 8001/5174, internal network for data
services).

Optional local tweaks go in `overrides.yml` here and are used as:

```bash
docker compose -f ../../docker-compose.yml -f overrides.yml up -d
```
