using Core.Dtos;

namespace Core.Services;

public interface ITaskService
{
    Task<IReadOnlyList<TaskDto>> GetTasksAsync(CancellationToken cancellationToken);

    Task<TaskDto?> GetTaskByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<TaskDto> CreateTaskAsync(CreateTaskRequest request, CancellationToken cancellationToken);

    Task<TaskDto?> UpdateTaskAsync(Guid id, UpdateTaskRequest request, CancellationToken cancellationToken);

    Task<bool> DeleteTaskAsync(Guid id, CancellationToken cancellationToken);
}
