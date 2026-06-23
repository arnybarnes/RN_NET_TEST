# React Native + .NET + Azure Functions Development Plan

## Goal

Build a small but credible demo that proves you can:

- design a backend-first .NET service
- test it locally before mobile work starts
- deploy the same application logic to Azure with the CLI
- connect a React Native app to the deployed backend

The goal is not to build a large product. The goal is to show a disciplined integration workflow from local service development to hosted mobile consumption.

## Core Delivery Sequence

Build in this order:

1. Local .NET backend
2. Local HTML tester for the backend
3. Azure CLI setup and verification
4. Azure Functions deployment of the backend
5. Hosted HTML tester for the Azure endpoint
6. React Native app using the Azure endpoint

This sequence reduces debugging noise. We prove the API first, then prove deployment, then build the mobile client against a known-good hosted service.

## Important Architecture Note

An ASP.NET Core Web API project does not deploy directly as an Azure Function without reshaping the host.

To avoid rework, use a shared-code solution with two thin hosts:

- `backend/Core`: models, DTOs, validation, services
- `backend/Infrastructure`: persistence and configuration
- `backend/LocalApi`: ASP.NET Core Web API host for local development
- `backend/AzureFunctions`: HTTP-triggered Azure Functions host for deployment

Both hosts should call the same application services so behavior stays consistent.

## Recommended Technical Choices

- IDE: Rider on macOS
- Language: C#
- Local host: ASP.NET Core Web API
- Cloud host: Azure Functions isolated worker
- ORM: Entity Framework Core
- Local database: SQLite
- Cloud database: Azure SQL Database
- API docs/testing: Swagger for the local API host
- Deployment tool: Azure CLI
- Mobile frontend: React Native
- Simple manual verification UI: plain HTML + JavaScript

## Database Strategy

Use Entity Framework Core from the beginning.

### Local development

- use `Microsoft.EntityFrameworkCore.Sqlite`
- store data in a local SQLite database file
- manage schema with EF Core migrations

### Azure deployment

- use `Microsoft.EntityFrameworkCore.SqlServer`
- connect the Azure Functions host to Azure SQL Database
- reuse the same entities, `DbContext`, and service layer

The application data model should stay the same across environments. Only the EF Core provider and connection string should change.

## Demo Domain

Use a simple `Tasks` domain.

### Entity

Use a `TaskItem` model with:

- `Id`
- `Title`
- `Description`
- `Status`
- `CreatedAt`
- `UpdatedAt`

### Contracts

Use DTOs instead of returning persistence entities directly.

Suggested DTOs:

- `TaskDto`
- `CreateTaskRequest`
- `UpdateTaskRequest`

## API Scope

Implement:

- `GET /api/tasks`
- `GET /api/tasks/{id}`
- `POST /api/tasks`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `GET /health`

The local API and Azure Functions surface should keep the same route shape if possible so the testers and React Native client only need a base URL change.

## Solution Structure

```text
backend/
  Core/
    Models/
    Dtos/
    Services/
  Infrastructure/
    Data/
    Persistence/
  LocalApi/
    Controllers/
    Program.cs
    appsettings.json
  AzureFunctions/
    Functions/
    Program.cs
html-testers/
  local/
    index.html
    app.js
  azure/
    index.html
    app.js
mobile/
  src/
    screens/
    services/
    config/
    types/
```

## Phase 1: Backend Core

Build the shared backend logic first.

### Work

- create the shared solution structure
- add `TaskItem`, DTOs, and validation
- add service interfaces and implementations
- add an EF Core `DbContext`
- add EF Core-backed persistence
- add initial migrations
- centralize business rules in shared services

### Outcome

- all CRUD behavior exists independently of host choice
- the code is organized so behavior is easy to trace and maintain

## Phase 2: Local API Host

Create the local ASP.NET Core API host used for fast iteration.

### Work

- build `LocalApi` as an ASP.NET Core Web API
- add controllers that call shared services
- add dependency injection
- configure EF Core with SQLite
- add Swagger
- add logging
- add CORS
- add `/health`

### Outcome

- API runs locally with `dotnet run`
- endpoints can be exercised in Swagger and the browser-based tester

## Phase 3: Local HTML Tester

Build a very small manual test client before starting React Native.

### Work

- create a plain HTML page with JavaScript fetch calls
- support list, create, update, and delete actions
- show request/response output and error states
- keep the API base URL configurable

### Outcome

- you can verify end-to-end behavior without emulator or simulator complexity

## Phase 4: Azure CLI Setup And Verification

Verify the local machine can actually deploy before building the cloud host.

### Azure CLI checks

Run and verify:

- `az version`
- `az login`
- `az account show`
- `az group list`
- `func --version`
- `dotnet --info`

### What must be true

- Azure CLI is installed
- you are logged into the correct Azure account
- the expected subscription is selected
- Azure Functions Core Tools is installed
- local .NET SDK matches the target framework
- Azure SQL free-offer eligibility is confirmed for the target subscription

### Deliverable

- a short setup checklist in the repo with the exact commands and expected outputs

## Phase 5: Azure Functions Host

Create a thin Azure Functions host over the shared backend logic.

### Work

- create an isolated worker Azure Functions project
- add HTTP-triggered functions matching the API behavior
- reuse shared services and EF Core data-access code where practical
- configure EF Core with Azure SQL in the Azure host
- externalize configuration through app settings and environment variables
- keep route names aligned with the local API when possible

### Outcome

- the backend can run locally as an API and in Azure as Functions

## Phase 6: Azure Deployment

Deploy with Azure CLI, not the IDE publish flow.

### Work

- create or reuse a resource group
- create or reuse an Azure SQL logical server and database
- create storage and function app resources
- publish the function app
- apply EF Core migrations to Azure SQL
- set application settings
- set the Azure SQL connection string
- capture the public base URL
- verify health and CRUD endpoints after deployment

### Outcome

- a working public backend endpoint exists for the hosted tester and mobile app

## Phase 7: Hosted HTML Tester

Create a second tester that points at Azure.

### Work

- duplicate the local tester with a production base URL
- make CORS expectations explicit
- verify the same CRUD flow against Azure

### Outcome

- browser-based proof that the deployed backend works before mobile integration starts

## Phase 8: React Native App

Build the mobile client only after the Azure endpoint is stable.

### Screens

- Task List screen
- Create Task screen
- Task Detail/Edit screen

### Behaviors

- API client module with configurable base URL
- loading state
- error state
- success feedback
- refresh after create/update/delete

### Outcome

- mobile app uses the deployed Azure backend rather than local machine networking

## Priorities If Time Is Tight

If time is limited, prioritize in this order:

1. Shared backend logic
2. Local API host
3. Local HTML tester
4. Azure CLI verification
5. Azure Functions deployment
6. Hosted HTML tester
7. React Native app

Cut polish before you cut end-to-end proof.

## Design Rationale To Document

Document these decisions clearly:

- Why build the backend first?
- Why use a local API host before React Native?
- Why keep shared services separate from the host?
- Why use Azure Functions for deployment in this demo?
- What changed between the local API host and Azure host?
- How does the React Native app switch between environments?
- What would change for production scale?

## Project Summary

Use a version of this:

> I built the backend first so I could verify the contract before adding mobile complexity. I kept the business logic in shared .NET services, used an ASP.NET Core API host for fast local development, then exposed the same logic through Azure Functions for deployment. I used simple HTML testers to validate both environments before wiring up the React Native app. That gave me a cleaner integration path and reduced debugging time.

## Build Prompt

Use this prompt with the AI:

```text
Build a small demo using a backend-first workflow.

Requirements:
- Shared .NET backend logic in C#
- TaskItem entity with Id, Title, Description, Status, CreatedAt, UpdatedAt
- DTOs and validation
- Entity Framework Core with migrations
- SQLite for local development
- Azure SQL Database for Azure deployment
- Local ASP.NET Core Web API host with Swagger, logging, CORS, and /health
- Azure Functions isolated worker host that reuses the same backend logic
- Endpoints for list/get/create/update/delete tasks
- Plain HTML tester for the local API
- Plain HTML tester for the Azure deployment
- React Native app that uses the Azure-hosted backend
- Configuration through environment variables where appropriate

Keep the code simple, clean, and easy to maintain.
```

## Final Success Criteria

The demo is successful if you can show:

- a local .NET backend running cleanly
- a local HTML page exercising the backend
- Azure CLI configured and verified on your machine
- the backend deployed to Azure Functions
- a hosted HTML tester proving the deployed endpoint works
- a React Native app calling the Azure-hosted backend

That is enough to tell a coherent end-to-end engineering story.
