using System.Data;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public static class SqlServerMigrationBootstrapper
{
    private const string InitialMigrationId = "20260623035001_InitialCreate";
    private const string ProductVersion = "10.0.9";

    public static async Task BootstrapInitialMigrationHistoryAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        if (!dbContext.Database.IsSqlServer())
        {
            return;
        }

        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;

        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            var taskItemsExists = await TableExistsAsync(connection, "TaskItems", cancellationToken);
            if (!taskItemsExists)
            {
                return;
            }

            var migrationHistoryExists = await TableExistsAsync(connection, "__EFMigrationsHistory", cancellationToken);
            if (!migrationHistoryExists)
            {
                await ExecuteNonQueryAsync(
                    connection,
                    """
                    CREATE TABLE [dbo].[__EFMigrationsHistory] (
                        [MigrationId] nvarchar(150) NOT NULL,
                        [ProductVersion] nvarchar(32) NOT NULL,
                        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
                    );
                    """,
                    cancellationToken);
            }

            var initialMigrationRecorded = await MigrationExistsAsync(connection, cancellationToken);
            if (initialMigrationRecorded)
            {
                return;
            }

            await InsertInitialMigrationAsync(connection, cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> TableExistsAsync(
        DbConnection connection,
        string tableName,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName
                )
                THEN 1
                ELSE 0
            END
            """;
        AddParameter(command, "@tableName", tableName);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result) == 1;
    }

    private static async Task<bool> MigrationExistsAsync(
        DbConnection connection,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM [dbo].[__EFMigrationsHistory]
                    WHERE [MigrationId] = @migrationId
                )
                THEN 1
                ELSE 0
            END
            """;
        AddParameter(command, "@migrationId", InitialMigrationId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result) == 1;
    }

    private static async Task InsertInitialMigrationAsync(
        DbConnection connection,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
            VALUES (@migrationId, @productVersion)
            """;
        AddParameter(command, "@migrationId", InitialMigrationId);
        AddParameter(command, "@productVersion", ProductVersion);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task ExecuteNonQueryAsync(
        DbConnection connection,
        string sql,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void AddParameter(DbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}
