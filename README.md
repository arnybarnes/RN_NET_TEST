# RN_NET_TEST

`RN_NET_TEST` is a small full-stack demo project that proves a backend-first workflow for a future React Native app.

Today, the working part of the project is a local .NET task API backed by SQLite, plus a lightweight HTML page you can use to test the API without Postman, Swagger, or a mobile client.

## What It Does

The demo exposes a simple `Tasks` API with these operations:

- list tasks
- get a task by ID
- create a task
- update a task
- delete a task
- check API health

The current backend uses:

- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- SQLite
- Expo / React Native
- plain HTML + JavaScript for manual testing

## Current Project Status

Working now:

- local task API in `backend/LocalApi`
- Azure Functions host scaffolded in `backend/AzureFunctions`
- shared backend projects in `backend/Core` and `backend/Infrastructure`
- local HTML tester in `html-testers/local`
- hosted HTML tester in `html-testers/azure`
- Expo React Native client in `mobile`
- repo-root launcher script for starting the API on macOS

Planned later:

- deeper mobile polish and packaging

## Quick Start

### 1. Prerequisites

Install:

- .NET 10 SDK

Verify:

```bash
dotnet --version
```

### 2. Start the Local API

On macOS, the easiest option is to double-click:

- [start-local-api.command](/Users/arnoldbiffna/Documents/dev/RN_NET_TEST/start-local-api.command)

That opens Terminal and runs the local API for you.

If you prefer the command line:

```bash
cd backend/LocalApi
dotnet run --launch-profile http
```

The API should start at:

```text
http://127.0.0.1:5024
```

### 3. Confirm It Is Running

In another terminal:

```bash
curl http://127.0.0.1:5024/health
curl http://127.0.0.1:5024/api/tasks
```

## Try the HTML Tester

Open this file in your browser:

- [html-testers/local/index.html](/Users/arnoldbiffna/Documents/dev/RN_NET_TEST/html-testers/local/index.html)

Then:

1. Leave the default base URL as `http://127.0.0.1:5024`
2. Click `Load tasks`
3. Create a task with the form
4. Edit or delete tasks from the list
5. Check the request/response log at the bottom if something fails

The tester supports:

- health check
- fetch all tasks
- create task
- update task
- delete task
- visible error reporting

## Try the Hosted Azure API

Open this file in your browser:

- [html-testers/azure/index.html](/Users/arnoldbiffna/Documents/dev/RN_NET_TEST/html-testers/azure/index.html)

It defaults to the deployed Azure Functions base URL:

```text
https://rnnettestfuncc30c423c3.azurewebsites.net
```

## Try the Mobile App

From the repo root:

```bash
cd mobile
npm install
npm start
```

Then use Expo to open the app on:

- iOS simulator
- Android emulator
- Expo Go on a device

The mobile app currently:

- points at the hosted Azure API by default
- loads tasks
- creates tasks
- updates tasks
- deletes tasks
- lets you override the base URL at runtime

## API Routes

The local API currently exposes:

```text
GET    /health
GET    /api/tasks
GET    /api/tasks/{id}
POST   /api/tasks
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}
```

## Database Notes

The local API uses SQLite with this connection string in [backend/LocalApi/appsettings.json](/Users/arnoldbiffna/Documents/dev/RN_NET_TEST/backend/LocalApi/appsettings.json):

```json
"DefaultConnection": "Data Source=tasks.db"
```

That means the database file is created in the `backend/LocalApi` directory when the API runs there.

If you need to apply migrations manually, run this from the repo root:

```bash
dotnet ef database update \
  --project backend/Infrastructure/Infrastructure.csproj \
  --startup-project backend/LocalApi/LocalApi.csproj \
  --context Infrastructure.Data.AppDbContext
```

## Project Layout

```text
backend/
  AzureFunctions/   Azure Functions isolated worker host
  Core/             Shared models, DTOs, and service contracts
  Infrastructure/   EF Core data access and service implementations
  LocalApi/         Local ASP.NET Core API host
html-testers/
  azure/            Browser-based tester for the deployed Azure endpoint
  local/            Browser-based local API tester
mobile/             Expo React Native client for the hosted task API
```

## Troubleshooting

If the API does not start:

- make sure `dotnet` is installed and available on your `PATH`
- confirm port `5024` is not already in use
- run the migration command above if the database schema is missing

If the tester cannot connect:

- make sure the API is running first
- confirm the tester base URL matches the API URL
- check the request/response log in the tester for the exact error

## Why This Repo Exists

This project is meant to demonstrate a disciplined integration path:

1. build and verify the backend locally
2. test it with a minimal browser client
3. scaffold the Azure Functions host over the same shared logic
4. later deploy that host to Azure
5. later connect a React Native client to the hosted backend

It is intentionally small. The goal is to prove the workflow cleanly, not to ship a large product.
