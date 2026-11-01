# Deploy

## Database (Neon, Postgres 16)
Create the project, then from `apps/api` with `DATABASE_URL` set:
```bash
uv run alembic upgrade head          # creates postgis + vector extensions and every table
```
Then load data (see `data/README.md`): IMD for both districts, both CRIDA plans, train the model.

## API (Cloud Run)
`--no-cpu-throttling` keeps CPU on after the 202 response so the background agent keeps running;
`--min-instances=1` avoids a cold start during judging. Turn both off after the event.
```bash
gcloud run deploy khetkavach-api --source apps/api --region asia-south1 \
  --allow-unauthenticated --min-instances=1 --no-cpu-throttling --memory=2Gi --cpu=2 --timeout=300 \
  --set-env-vars "CORS_ORIGINS=https://<app>.vercel.app,GEMINI_MODEL=gemini-flash-latest,SATELLITE_PRIMARY=sentinel_hub" \
  --set-secrets "DATABASE_URL=db-url:latest,ADMIN_KEY=admin-key:latest,GEMINI_API_KEY=gemini:latest,CDSE_CLIENT_ID=cdse-id:latest,CDSE_CLIENT_SECRET=cdse-secret:latest,TELEGRAM_BOT_TOKEN=tg-token:latest,TELEGRAM_WEBHOOK_SECRET=tg-secret:latest"
```
The container runs `alembic upgrade head` before serving.

## Monitoring every 6 hours (Cloud Scheduler)
```bash
gcloud scheduler jobs create http khetkavach-monitor --location asia-south1 --schedule "0 */6 * * *" \
  --uri "https://<api-url>/api/jobs/monitor" --http-method POST --headers "X-Admin-Key=<ADMIN_KEY>"
```

## Telegram webhook
```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<api-url>/api/telegram/webhook" -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```
A farmer sends `/start <FIELD CODE> hi` to the bot (the code is on the field list).

## Web (Vercel)
Root directory `apps/web`, env `NEXT_PUBLIC_API_URL=https://<api-url>`.

## Before judging
```bash
uv run python -m scripts.admin prewarm --base https://<api-url>      # real responses in the cache
uv run python -m scripts.edge_cases --base https://<api-url>          # 422/404 drill
git tag demo-ready && git push --tags                                  # rollback point
```
Rollback: `gcloud run services update-traffic khetkavach-api --to-revisions <previous>=100`.
