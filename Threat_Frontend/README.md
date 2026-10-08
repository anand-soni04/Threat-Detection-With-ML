# DefendX Frontend

Next.js 16 (App Router) dashboard for the Threat Detection with ML project. It talks to the Flask API in `../Threat_Backend` over HTTPS.

**Live:** https://threat-detection-with-ml.vercel.app

See the [main README](../README.md) for the full architecture, API reference and deployment guide.

## Setup

```bash
npm install
npm run dev      # prints the address to open in your browser
```

| Script | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API, no trailing slash | `https://threat-backend-0wk6.onrender.com` |

Put it in `.env.local` for development. Production builds also read `.env.production`. It is embedded at **build time**, so redeploy after changing it. The backend must list this app's origin in its `ALLOWED_ORIGINS`, otherwise the browser blocks the requests (CORS).

## Structure

```
src/
├── app/            # Routes: / (dashboard), detection, alerts, logs, search, analytics, sources, settings
├── components/     # layout/ (sidebar, header), dashboard/ widgets, ui/ (shadcn/ui)
└── lib/
    ├── api.ts      # Typed API client (all backend calls live here)
    ├── search.ts   # Search-term parsing used for result highlighting
    └── utils.ts    # Class names, timestamp formatting helpers
```

## Deploying to Vercel

1. Import the repository in Vercel.
2. Set **Root Directory** to `Threat_Frontend` and the framework preset to **Next.js**.
3. Add `NEXT_PUBLIC_API_URL` pointing at your backend, then deploy.
4. Later pushes to the connected branch redeploy automatically.
