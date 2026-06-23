using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Core.Dtos;
using Core.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace AzureFunctions.Functions;

public sealed class TasksFunctions(ITaskService taskService)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true,
        Converters =
        {
            new JsonStringEnumConverter()
        }
    };

    [Function(nameof(GetHealth))]
    public Task<HttpResponseData> GetHealth(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData request,
        CancellationToken cancellationToken)
    {
        return CreateJsonResponseAsync(
            request,
            HttpStatusCode.OK,
            new { status = "Healthy" },
            cancellationToken);
    }

    [Function(nameof(GetTasks))]
    public Task<HttpResponseData> GetTasks(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "api/tasks")] HttpRequestData request,
        CancellationToken cancellationToken)
    {
        return HandleAsync(
            request,
            cancellationToken,
            () => taskService.GetTasksAsync(cancellationToken));
    }

    [Function(nameof(GetTask))]
    public async Task<HttpResponseData> GetTask(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "api/tasks/{id:guid}")] HttpRequestData request,
        string id,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var taskId))
        {
            return await CreateErrorResponseAsync(
                request,
                HttpStatusCode.BadRequest,
                "Invalid task id.",
                cancellationToken);
        }

        var task = await taskService.GetTaskByIdAsync(taskId, cancellationToken);
        return task is null
            ? await CreateErrorResponseAsync(request, HttpStatusCode.NotFound, "Task not found.", cancellationToken)
            : await CreateJsonResponseAsync(request, HttpStatusCode.OK, task, cancellationToken);
    }

    [Function(nameof(CreateTask))]
    public async Task<HttpResponseData> CreateTask(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "api/tasks")] HttpRequestData request,
        CancellationToken cancellationToken)
    {
        var payload = await DeserializeAsync<CreateTaskRequest>(request, cancellationToken);
        if (payload is null)
        {
            return await CreateErrorResponseAsync(
                request,
                HttpStatusCode.BadRequest,
                "Request body is required.",
                cancellationToken);
        }

        var validationErrors = Validate(payload);
        if (validationErrors.Count > 0)
        {
            return await CreateValidationResponseAsync(request, validationErrors, cancellationToken);
        }

        var task = await taskService.CreateTaskAsync(payload, cancellationToken);
        var response = await CreateJsonResponseAsync(request, HttpStatusCode.Created, task, cancellationToken);
        response.Headers.Add("Location", $"/api/tasks/{task.Id}");
        return response;
    }

    [Function(nameof(UpdateTask))]
    public async Task<HttpResponseData> UpdateTask(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "api/tasks/{id:guid}")] HttpRequestData request,
        string id,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var taskId))
        {
            return await CreateErrorResponseAsync(
                request,
                HttpStatusCode.BadRequest,
                "Invalid task id.",
                cancellationToken);
        }

        var payload = await DeserializeAsync<UpdateTaskRequest>(request, cancellationToken);
        if (payload is null)
        {
            return await CreateErrorResponseAsync(
                request,
                HttpStatusCode.BadRequest,
                "Request body is required.",
                cancellationToken);
        }

        var validationErrors = Validate(payload);
        if (validationErrors.Count > 0)
        {
            return await CreateValidationResponseAsync(request, validationErrors, cancellationToken);
        }

        var task = await taskService.UpdateTaskAsync(taskId, payload, cancellationToken);
        return task is null
            ? await CreateErrorResponseAsync(request, HttpStatusCode.NotFound, "Task not found.", cancellationToken)
            : await CreateJsonResponseAsync(request, HttpStatusCode.OK, task, cancellationToken);
    }

    [Function(nameof(DeleteTask))]
    public async Task<HttpResponseData> DeleteTask(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "api/tasks/{id:guid}")] HttpRequestData request,
        string id,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(id, out var taskId))
        {
            return await CreateErrorResponseAsync(
                request,
                HttpStatusCode.BadRequest,
                "Invalid task id.",
                cancellationToken);
        }

        var deleted = await taskService.DeleteTaskAsync(taskId, cancellationToken);
        if (!deleted)
        {
            return await CreateErrorResponseAsync(request, HttpStatusCode.NotFound, "Task not found.", cancellationToken);
        }

        return request.CreateResponse(HttpStatusCode.NoContent);
    }

    private static async Task<HttpResponseData> HandleAsync<T>(
        HttpRequestData request,
        CancellationToken cancellationToken,
        Func<Task<T>> action)
        where T : notnull
    {
        var payload = await action();
        return await CreateJsonResponseAsync(request, HttpStatusCode.OK, payload, cancellationToken);
    }

    private static async Task<T?> DeserializeAsync<T>(HttpRequestData request, CancellationToken cancellationToken)
    {
        if (request.Body is null)
        {
            return default;
        }

        return await JsonSerializer.DeserializeAsync<T>(request.Body, JsonOptions, cancellationToken);
    }

    private static Dictionary<string, string[]> Validate<T>(T instance)
    {
        var validationContext = new ValidationContext(instance!);
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(instance!, validationContext, results, validateAllProperties: true);

        return results
            .SelectMany(result =>
            {
                var members = result.MemberNames.Any() ? result.MemberNames : ["body"];
                return members.Select(member => new
                {
                    Member = member,
                    Message = result.ErrorMessage ?? "Validation failed."
                });
            })
            .GroupBy(x => x.Member)
            .ToDictionary(group => group.Key, group => group.Select(x => x.Message).ToArray());
    }

    private static Task<HttpResponseData> CreateValidationResponseAsync(
        HttpRequestData request,
        Dictionary<string, string[]> errors,
        CancellationToken cancellationToken)
    {
        return CreateJsonResponseAsync(
            request,
            HttpStatusCode.BadRequest,
            new
            {
                title = "One or more validation errors occurred.",
                status = (int)HttpStatusCode.BadRequest,
                errors
            },
            cancellationToken);
    }

    private static Task<HttpResponseData> CreateErrorResponseAsync(
        HttpRequestData request,
        HttpStatusCode statusCode,
        string title,
        CancellationToken cancellationToken)
    {
        return CreateJsonResponseAsync(
            request,
            statusCode,
            new
            {
                title,
                status = (int)statusCode
            },
            cancellationToken);
    }

    private static async Task<HttpResponseData> CreateJsonResponseAsync(
        HttpRequestData request,
        HttpStatusCode statusCode,
        object payload,
        CancellationToken cancellationToken)
    {
        var response = request.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await JsonSerializer.SerializeAsync(response.Body, payload, JsonOptions, cancellationToken);
        return response;
    }
}
