using Core.Services;
using Infrastructure.Data;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var provider = ResolveDatabaseProvider(configuration);
        var connectionString = ResolveConnectionString(configuration, provider);

        services.AddDbContext<AppDbContext>(options =>
        {
            switch (provider)
            {
                case "sqlite":
                    options.UseSqlite(connectionString);
                    break;
                case "sqlserver":
                    options.UseSqlServer(connectionString, sqlServerOptions =>
                    {
                        sqlServerOptions.EnableRetryOnFailure();
                    });
                    options.ConfigureWarnings(warnings =>
                    {
                        warnings.Ignore(RelationalEventId.PendingModelChangesWarning);
                    });
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported database provider '{provider}'.");
            }
        });

        services.AddScoped<ITaskService, TaskService>();

        return services;
    }

    private static string ResolveDatabaseProvider(IConfiguration configuration)
    {
        var configuredProvider = configuration["DatabaseProvider"];
        if (!string.IsNullOrWhiteSpace(configuredProvider))
        {
            return configuredProvider.Trim().ToLowerInvariant();
        }

        return string.IsNullOrWhiteSpace(configuration["AZURE_SQL_CONNECTION_STRING"])
            ? "sqlite"
            : "sqlserver";
    }

    private static string ResolveConnectionString(IConfiguration configuration, string provider)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        if (provider == "sqlite")
        {
            return "Data Source=tasks.db";
        }

        connectionString = configuration["AZURE_SQL_CONNECTION_STRING"];
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        throw new InvalidOperationException(
            "No database connection string was configured. Set ConnectionStrings:DefaultConnection or AZURE_SQL_CONNECTION_STRING.");
    }
}
