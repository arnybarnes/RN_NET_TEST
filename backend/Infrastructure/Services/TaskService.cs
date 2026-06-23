using Core.Dtos;
using Core.Models;
using Core.Services;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

public sealed class TaskService(AppDbContext dbContext) : ITaskService
{
    public async Task<IReadOnlyList<TaskDto>> GetTasksAsync(CancellationToken cancellationToken)
    {
        var tasks = await dbContext.TaskItems
            .AsNoTracking()
            .Select(ToDtoExpression())
            .ToListAsync(cancellationToken);

        return tasks
            .OrderByDescending(x => x.UpdatedAt)
            .ToList();
    }

    public async Task<TaskDto?> GetTaskByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await dbContext.TaskItems
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(ToDtoExpression())
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<TaskDto> CreateTaskAsync(CreateTaskRequest request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        var taskItem = new TaskItem
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Status = TaskItemStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.TaskItems.Add(taskItem);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(taskItem);
    }

    public async Task<TaskDto?> UpdateTaskAsync(Guid id, UpdateTaskRequest request, CancellationToken cancellationToken)
    {
        var taskItem = await dbContext.TaskItems.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (taskItem is null)
        {
            return null;
        }

        taskItem.Title = request.Title.Trim();
        taskItem.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        taskItem.Status = request.Status;
        taskItem.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(taskItem);
    }

    public async Task<bool> DeleteTaskAsync(Guid id, CancellationToken cancellationToken)
    {
        var taskItem = await dbContext.TaskItems.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (taskItem is null)
        {
            return false;
        }

        dbContext.TaskItems.Remove(taskItem);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static TaskDto ToDto(TaskItem taskItem)
    {
        return new TaskDto(
            taskItem.Id,
            taskItem.Title,
            taskItem.Description,
            taskItem.Status,
            taskItem.CreatedAt,
            taskItem.UpdatedAt);
    }

    private static System.Linq.Expressions.Expression<Func<TaskItem, TaskDto>> ToDtoExpression()
    {
        return taskItem => new TaskDto(
            taskItem.Id,
            taskItem.Title,
            taskItem.Description,
            taskItem.Status,
            taskItem.CreatedAt,
            taskItem.UpdatedAt);
    }
}
