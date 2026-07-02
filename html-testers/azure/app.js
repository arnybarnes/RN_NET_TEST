const state = {
    tasks: [],
    isLoading: false
};

const elements = {
    baseUrlInput: document.querySelector("#baseUrlInput"),
    globalStatus: document.querySelector("#globalStatus"),
    taskCount: document.querySelector("#taskCount"),
    tasksContainer: document.querySelector("#tasksContainer"),
    requestLog: document.querySelector("#requestLog"),
    createTaskForm: document.querySelector("#createTaskForm"),
    loadTasksButton: document.querySelector("#loadTasksButton"),
    refreshTasksButton: document.querySelector("#refreshTasksButton"),
    healthCheckButton: document.querySelector("#healthCheckButton"),
    taskTemplate: document.querySelector("#taskTemplate")
};

function normalizeBaseUrl() {
    return elements.baseUrlInput.value.trim().replace(/\/+$/, "");
}

function setStatus(message, tone = "") {
    elements.globalStatus.textContent = message;
    elements.globalStatus.className = tone ? `status-line ${tone}` : "status-line";
}

function setLog(title, payload) {
    const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    elements.requestLog.textContent = `${title}\n\n${body}`;
}

function formatTimestamp(value) {
    if (!value) {
        return "n/a";
    }

    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

function escapeEmptyText(value, fallback = "No description") {
    return value && value.trim() ? value : fallback;
}

async function request(path, options = {}) {
    const baseUrl = normalizeBaseUrl();
    if (!baseUrl) {
        throw new Error("Base URL is required.");
    }

    const url = `${baseUrl}${path}`;
    const config = {
        method: options.method ?? "GET",
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers ?? {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    };

    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    setLog(`${config.method} ${url} -> ${response.status} ${response.statusText}`, data || "(empty response)");

    if (!response.ok) {
        const detail = extractErrorMessage(data) || `${response.status} ${response.statusText}`;
        throw new Error(detail);
    }

    return data;
}

function extractErrorMessage(data) {
    if (!data) {
        return "";
    }

    if (typeof data === "string") {
        return data;
    }

    if (typeof data.title === "string" && typeof data.detail === "string") {
        return `${data.title}: ${data.detail}`;
    }

    if (typeof data.title === "string") {
        return data.title;
    }

    if (data.errors && typeof data.errors === "object") {
        const details = Object.entries(data.errors)
            .flatMap(([field, messages]) => {
                if (!Array.isArray(messages)) {
                    return [];
                }

                return messages.map((message) => `${field}: ${message}`);
            });

        return details.join("\n");
    }

    return JSON.stringify(data);
}

function renderTasks() {
    elements.tasksContainer.innerHTML = "";
    elements.taskCount.textContent = `${state.tasks.length} task${state.tasks.length === 1 ? "" : "s"}`;

    if (state.tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = state.isLoading ? "Loading tasks..." : "No tasks returned by the API.";
        elements.tasksContainer.append(empty);
        return;
    }

    for (const task of state.tasks) {
        const fragment = elements.taskTemplate.content.cloneNode(true);
        const card = fragment.querySelector(".task-card");
        const editForm = fragment.querySelector('[data-role="edit-form"]');
        const deleteButton = fragment.querySelector('[data-role="delete-button"]');

        fragment.querySelector('[data-role="title"]').textContent = task.title;
        fragment.querySelector('[data-role="status"]').textContent = task.status;
        fragment.querySelector('[data-role="id"]').textContent = task.id;
        fragment.querySelector('[data-role="description"]').textContent = escapeEmptyText(task.description);
        fragment.querySelector('[data-role="created-at"]').textContent = `Created: ${formatTimestamp(task.createdAt)}`;
        fragment.querySelector('[data-role="updated-at"]').textContent = `Updated: ${formatTimestamp(task.updatedAt)}`;

        editForm.elements.title.value = task.title;
        editForm.elements.description.value = task.description ?? "";
        editForm.elements.status.value = task.status;

        editForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const payload = {
                title: editForm.elements.title.value,
                description: editForm.elements.description.value,
                status: editForm.elements.status.value
            };

            await runMutation(`Updating ${task.id}`, async () => {
                await request(`/api/tasks/${task.id}`, {
                    method: "PUT",
                    body: payload
                });
                await loadTasks("Task updated.");
            });
        });

        deleteButton.addEventListener("click", async () => {
            const confirmed = window.confirm(`Delete task "${task.title}"?`);
            if (!confirmed) {
                return;
            }

            await runMutation(`Deleting ${task.id}`, async () => {
                await request(`/api/tasks/${task.id}`, { method: "DELETE" });
                await loadTasks("Task deleted.");
            });
        });

        card.dataset.taskId = task.id;
        elements.tasksContainer.append(fragment);
    }
}

async function loadTasks(successMessage = "Tasks loaded.") {
    state.isLoading = true;
    renderTasks();
    setStatus("Loading tasks...");

    try {
        const tasks = await request("/api/tasks");
        state.tasks = Array.isArray(tasks) ? tasks : [];
        setStatus(successMessage, "success");
    } catch (error) {
        state.tasks = [];
        setStatus(error.message, "error");
    } finally {
        state.isLoading = false;
        renderTasks();
    }
}

async function runMutation(activity, callback) {
    setStatus(`${activity}...`);

    try {
        await callback();
    } catch (error) {
        setStatus(error.message, "error");
    }
}

elements.createTaskForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
        title: elements.createTaskForm.elements.title.value,
        description: elements.createTaskForm.elements.description.value
    };

    await runMutation("Creating task", async () => {
        await request("/api/tasks", {
            method: "POST",
            body: payload
        });
        elements.createTaskForm.reset();
        await loadTasks("Task created.");
    });
});

elements.loadTasksButton.addEventListener("click", () => {
    loadTasks();
});

elements.refreshTasksButton.addEventListener("click", () => {
    loadTasks("Tasks refreshed.");
});

elements.healthCheckButton.addEventListener("click", async () => {
    setStatus("Checking health...");

    try {
        const response = await fetch(`${normalizeBaseUrl()}/health`, {
            method: "GET",
            headers: { Accept: "text/plain" }
        });
        const text = await response.text();

        setLog(`GET ${normalizeBaseUrl()}/health -> ${response.status} ${response.statusText}`, text || "(empty response)");

        if (!response.ok) {
            throw new Error(text || `${response.status} ${response.statusText}`);
        }

        setStatus("Health check passed.", "success");
    } catch (error) {
        setStatus(error.message, "error");
    }
});

renderTasks();
