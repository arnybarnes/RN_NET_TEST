using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> TaskItems => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var taskItem = modelBuilder.Entity<TaskItem>();

        taskItem.HasKey(x => x.Id);
        taskItem.Property(x => x.Title).HasMaxLength(200).IsRequired();
        taskItem.Property(x => x.Description).HasMaxLength(1000);
        taskItem.Property(x => x.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
        taskItem.Property(x => x.CreatedAt).IsRequired();
        taskItem.Property(x => x.UpdatedAt).IsRequired();
    }
}
