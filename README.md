# OpenListNext

This is a customized full-stack version of OpenList powered by a lightweight Node.js (Hono + TypeScript) backend rather than Go. 

## Run the server

```bash
npm run dev
```

It will boot up the backend API and Vite frontend server concurrently.

## Mock / Local FS

This backend runs natively in a container mapping file uploads, reads, and downloads directly into `public_data/`. 

## Admin configuration

Credentials to access backend:
**User**: `admin`
**Pass**: `admin`

Settings and Storage configurations are persisted purely via JSON: `public_data/db.json`.

Enjoy the modern React/Solid based file list.
