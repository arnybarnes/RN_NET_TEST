# Azure Setup Checklist

This checklist captures the local tooling and Azure account state required before building the Azure Functions host and deploying this project.

Status in this repo as of June 23, 2026:

- Azure CLI is installed
- Azure Functions Core Tools is installed
- .NET 10 SDK is installed
- Azure login is active
- expected subscription is selected
- expected resource group exists
- Azure SQL server and database were created successfully during deployment
- Function App deployment succeeded

## Commands To Verify

Run these commands from the repo root.

### Azure CLI

```bash
az version
```

Expected result for the current machine:

```json
{
  "azure-cli": "2.87.0",
  "azure-cli-core": "2.87.0",
  "azure-cli-telemetry": "1.1.0",
  "extensions": {}
}
```

### Azure Login And Active Subscription

```bash
az account show
```

Expected fields for the current machine:

```json
{
  "environmentName": "AzureCloud",
  "id": "c30c423c-db11-4a20-8ac4-e3c202531276",
  "isDefault": true,
  "name": "biffnaArnoldGmailPAYG",
  "state": "Enabled",
  "tenantDisplayName": "Default Directory",
  "user": {
    "name": "biffnaarnold@gmail.com",
    "type": "user"
  }
}
```

If this command fails because you are signed out, run:

```bash
az login
```

### Resource Groups

```bash
az group list
```

Expected relevant result for the current machine:

```json
[
  {
    "name": "biffna",
    "location": "eastus",
    "properties": {
      "provisioningState": "Succeeded"
    }
  }
]
```

### Azure Functions Core Tools

```bash
func --version
```

Expected result for the current machine:

```text
4.12.0
```

### .NET SDK

```bash
dotnet --info
```

Expected important fields for the current machine:

```text
.NET SDK:
 Version:           10.0.101

Host:
  Version:      10.0.1
  Architecture: arm64
```

## What Must Be True Before Deployment Work

- `az account show` returns the `biffnaArnoldGmailPAYG` subscription as default
- `az group list` includes the `biffna` resource group in `eastus`
- `func --version` returns a valid 4.x version
- `dotnet --info` shows the .NET 10 SDK installed

## Azure SQL Note

The deployment used an Azure SQL server in `westus` after `eastus` and `eastus2` both rejected new SQL server provisioning.

The deployed database was created successfully with a low-cost serverless General Purpose configuration and the free-limit flag enabled.

This checklist does not make pricing guarantees. Azure pricing and eligibility can change independently of the repo.

## Follow-Up

Deployment is complete. The Azure Functions host now applies EF Core migrations on startup for the configured database provider.
