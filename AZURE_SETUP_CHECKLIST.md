# Azure Setup Checklist

This checklist captures the local tooling and Azure account state required before building the Azure Functions host and deploying this project.

Status in this repo as of June 22, 2026:

- Azure CLI is installed
- Azure Functions Core Tools is installed
- .NET 10 SDK is installed
- Azure login is active
- expected subscription is selected
- expected resource group exists

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

## Azure SQL Check

The plan calls for confirming Azure SQL free-offer eligibility for the target subscription. That has not been verified in this document.

Before creating the cloud database, confirm:

- pricing and SKU constraints for the intended Azure SQL option
- whether the `biffnaArnoldGmailPAYG` subscription is eligible for the desired free or low-cost configuration

## Next Planned Step

After this checklist is satisfied, the next implementation step is:

- create `backend/AzureFunctions` as a thin Azure Functions host over the shared backend logic
