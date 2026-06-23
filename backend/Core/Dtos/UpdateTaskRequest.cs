using System.ComponentModel.DataAnnotations;
using Core.Models;

namespace Core.Dtos;

public sealed class UpdateTaskRequest
{
    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [Required]
    public TaskItemStatus Status { get; set; } = TaskItemStatus.Pending;
}
