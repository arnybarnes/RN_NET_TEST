# RN_NET_TEST

`RN_NET_TEST` is a small full-stack demo project that proves a backend-first workflow across local .NET development, Azure hosting, and a React Native client.

The repo includes a local .NET task API backed by SQLite, an Azure-hosted Functions version backed by Azure SQL, lightweight HTML testers, and an Expo mobile client.

## Links

- **GitHub repo:** https://github.com/arnybarnes/RN_NET_TEST
- **Hosted HTML tester:** https://arnoldbiffna.com/reactNativeASPnetSample/
- **Azure Functions API:** https://biffnaappserver-bcbagah5g8g9apb3.centralus-01.azurewebsites.net

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
- Azure SQL Database
- Expo / React Native
- plain HTML + JavaScript for manual testing

## Current Project Status

Working now:

- local task API in `backend/LocalApi`
- Azure Functions host scaffolded in `backend/AzureFunctions`
- deployed Azure Functions endpoint at `https://biffnaappserver-bcbagah5g8g9apb3.centralus-01.azurewebsites.net`
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

The Azure tester is deployed live at:

- https://arnoldbiffna.com/reactNativeASPnetSample/

You can also run it locally by opening this file in your browser:

- [html-testers/azure/index.html](/Users/arnoldbiffna/Documents/dev/RN_NET_TEST/html-testers/azure/index.html)

Either way, it defaults to the deployed Azure Functions base URL:

```text
https://biffnaappserver-bcbagah5g8g9apb3.centralus-01.azurewebsites.net
```

To keep the Azure Functions app warm, double-click:

- [keep-azure-api-awake.command](/Users/arnoldbiffna/Documents/dev/RN_NET_TEST/keep-azure-api-awake.command)

That script uses `caffeinate` while it is running and calls the Azure `/health` endpoint every 7 minutes. It prints the elapsed runtime, number of calls made, HTTP status, response time, and health response for each check. Close the Terminal window or press `Ctrl-C` to stop it.

## Mobile App

The mobile client is an Expo / React Native app called **RN Task Console**. It talks directly to the deployed Azure Functions endpoint and exercises the full CRUD surface of the `Tasks` API from a phone. The UI is organized into three tabs — **Connect**, **Create**, and **List** — selected from a bottom tab bar.

### Tabs

| Connect | Create | List |
| --- | --- | --- |
| ![Connect tab showing the API base URL, Health check and Count tasks buttons, and a Health: Healthy result](mobile_screen_caps/01-connect.png) | ![Create tab showing the task title and description fields with a Create task button](mobile_screen_caps/02-create.png) | ![List tab showing task cards with editable fields, status selector, and Save/Delete actions](mobile_screen_caps/03-list.png) |

**Connect** holds the API base URL (defaulting to the hosted Azure endpoint), a `Health check` button that pings `/health`, and a `Count tasks` button that reports how many tasks are stored. The result of the last action is shown below the buttons (for example, `Health: Healthy`).

**Create** is a focused form with `Task title` and `Task description` fields and a `Create task` button. Submitting posts to the API and automatically switches to the List tab so you can see the new task.

**List** shows every task as a card with its title, ID, editable title/description fields, a status selector (`Pending` / `InProgress` / `Completed`), `Save` and `Delete` actions, and created/updated timestamps. A `Refresh tasks` button and a live task count sit at the top.

### What it does

The mobile app currently:

- points at the hosted Azure API by default
- lets you override the base URL at runtime
- runs a health check against the API
- reports how many tasks are stored
- creates tasks
- lists tasks
- updates task title, description, and status inline
- deletes tasks

### Run it

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

The database is **not** committed to the repo (`*.db` is gitignored), so a fresh clone starts without one. On startup the local API applies EF Core migrations automatically (`Database.MigrateAsync()` in [backend/LocalApi/Program.cs](/Users/arnoldbiffna/Documents/dev/RN_NET_TEST/backend/LocalApi/Program.cs)), so the first run creates `tasks.db` with the schema and no data. No manual setup step is required.

If you ever want to apply migrations manually anyway, run this from the repo root:

```bash
dotnet ef database update \
  --project backend/Infrastructure/Infrastructure.csproj \
  --startup-project backend/LocalApi/LocalApi.csproj \
  --context Infrastructure.Data.AppDbContext
```

Azure deployment note:

- the Azure Functions host also applies EF Core migrations on startup for the configured database provider

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
- the schema is created automatically on startup; if it somehow gets out of sync, run the migration command above

If the tester cannot connect:

- make sure the API is running first
- confirm the tester base URL matches the API URL
- check the request/response log in the tester for the exact error

## Why This Repo Exists

This project is meant to demonstrate a disciplined integration path:

1. build and verify the backend locally
2. test it with a minimal browser client
3. scaffold the Azure Functions host over the same shared logic
4. deploy that host to Azure
5. connect a React Native client to the hosted backend

It is intentionally small. The goal is to prove the workflow cleanly, not to ship a large product.
