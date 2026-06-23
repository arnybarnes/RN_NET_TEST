using Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Infrastructure;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((context, services) =>
    {
        services.AddInfrastructure(context.Configuration);
    })
    .Build();

using (var scope = host.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    try
    {
        await dbContext.Database.MigrateAsync();
    }
    catch (InvalidOperationException ex) when (ex.Message.Contains("PendingModelChangesWarning", StringComparison.Ordinal))
    {
        Console.Error.WriteLine("Skipping startup migration because the current SQL Server model differs from the shared migration snapshot.");
        Console.Error.WriteLine(ex.Message);
    }
    catch (InvalidOperationException ex) when (ex.InnerException is SqlException sqlException)
    {
        Console.Error.WriteLine($"Skipping startup migration because Azure SQL is currently unavailable ({sqlException.Number}).");
        Console.Error.WriteLine(sqlException.Message);
    }
    catch (SqlException ex) when (ex.Number == 2714)
    {
        Console.Error.WriteLine("Skipping startup migration because the target schema objects already exist in Azure SQL.");
        Console.Error.WriteLine(ex.Message);
    }
}

await host.RunAsync();
