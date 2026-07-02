const state = {
    tasks: [],
    isLoading: false,
    currentIndex: 0,
    requestStartedAt: null
};

const elements = {
    baseUrlInput: document.querySelector("#baseUrlInput"),
    globalStatus: document.querySelector("#globalStatus"),
    taskCount: document.querySelector("#taskCount"),
    tasksContainer: document.querySelector("#tasksContainer"),
    tasksTrack: document.querySelector("#tasksContainer"),
    carouselIndicator: document.querySelector("#carouselIndicator"),
    prevTaskButton: document.querySelector("#prevTaskButton"),
    nextTaskButton: document.querySelector("#nextTaskButton"),
    logHeader: document.querySelector("#logHeader"),
    requestLog: document.querySelector("#requestLog"),
    responseLog: document.querySelector("#responseLog"),
    clearLogButton: document.querySelector("#clearLogButton"),
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

function formatLogTime(date) {
    const meridiem = date.getHours() >= 12 ? "PM" : "AM";
    const hours = date.getHours() % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const millis = String(date.getMilliseconds()).padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${millis} ${meridiem}`;
}

function formatPayload(payload) {
    if (payload === undefined || payload === null || payload === "") {
        return "(empty)";
    }

    if (typeof payload === "string") {
        try {
            return JSON.stringify(JSON.parse(payload), null, 2);
        } catch {
            return payload;
        }
    }

    return JSON.stringify(payload, null, 2);
}

const MAX_LOG_ENTRIES = 50;

function appendLogEntry(stream, entry) {
    const placeholder = stream.querySelector(".log-empty");
    if (placeholder) {
        placeholder.remove();
    }

    stream.prepend(entry);

    while (stream.children.length > MAX_LOG_ENTRIES) {
        stream.lastElementChild.remove();
    }
}

function makeBadge(className, text, dataAttr, dataValue) {
    const badge = document.createElement("span");
    badge.className = className;
    badge.textContent = text;
    if (dataAttr) {
        badge.dataset[dataAttr] = dataValue;
    }
    return badge;
}

function logRequest(method, url, config, time) {
    state.requestStartedAt = time;
    elements.logHeader.textContent = `${method} ${url}`;

    const entry = document.createElement("div");
    entry.className = "log-entry";

    const head = document.createElement("div");
    head.className = "log-entry-head";
    head.append(
        makeBadge("method-badge", method, "method", method),
        makeBadge("log-time", formatLogTime(time))
    );

    const urlLine = document.createElement("div");
    urlLine.className = "log-entry-url";
    urlLine.textContent = url;

    const body = document.createElement("pre");
    body.className = "log-entry-body";
    body.textContent = [
        "Headers:",
        formatPayload(config.headers ?? {}),
        "",
        "Body:",
        formatPayload(config.body)
    ].join("\n");

    entry.append(head, urlLine, body);
    appendLogEntry(elements.requestLog, entry);
}

function logResponse(method, url, status, statusText, payload, time) {
    const elapsed =
        state.requestStartedAt instanceof Date
            ? `${formatLogTime(time)} · ${time.getTime() - state.requestStartedAt.getTime()} ms`
            : formatLogTime(time);

    elements.logHeader.textContent = `${method} ${url} -> ${status} ${statusText}`;

    const entry = document.createElement("div");
    entry.className = "log-entry";

    const head = document.createElement("div");
    head.className = "log-entry-head";
    head.append(
        makeBadge("status-badge", `${status} ${statusText}`.trim(), "ok", String(status >= 200 && status < 400)),
        makeBadge("log-time", elapsed)
    );

    const body = document.createElement("pre");
    body.className = "log-entry-body";
    body.textContent = formatPayload(payload);

    entry.append(head, body);
    appendLogEntry(elements.responseLog, entry);
}

function clearLogs() {
    elements.logHeader.textContent = "No requests yet.";
    elements.requestLog.innerHTML = '<span class="log-empty">No requests yet.</span>';
    elements.responseLog.innerHTML = '<span class="log-empty">No responses yet.</span>';
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

    logRequest(config.method, url, config, new Date());

    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    logResponse(
        config.method,
        url,
        response.status,
        response.statusText,
        data === "" ? "(empty response)" : data,
        new Date()
    );

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
    state.currentIndex = clampIndex(state.currentIndex);

    if (state.tasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = state.isLoading ? "Loading tasks..." : "No tasks returned by the API.";
        elements.tasksContainer.append(empty);
        updateCarousel();
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

    updateCarousel();
}

function clampIndex(index) {
    if (state.tasks.length === 0) {
        return 0;
    }

    return Math.min(Math.max(index, 0), state.tasks.length - 1);
}

function updateCarousel() {
    const total = state.tasks.length;
    const position = total === 0 ? 0 : state.currentIndex + 1;

    elements.tasksTrack.style.transform = `translateX(-${state.currentIndex * 100}%)`;
    elements.carouselIndicator.textContent = `${position} / ${total}`;
    elements.prevTaskButton.disabled = total === 0 || state.currentIndex === 0;
    elements.nextTaskButton.disabled = total === 0 || state.currentIndex >= total - 1;
}

function goToTask(index) {
    const next = clampIndex(index);
    if (next === state.currentIndex) {
        return;
    }

    state.currentIndex = next;
    updateCarousel();
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

elements.clearLogButton.addEventListener("click", () => {
    clearLogs();
});

elements.prevTaskButton.addEventListener("click", () => {
    goToTask(state.currentIndex - 1);
});

elements.nextTaskButton.addEventListener("click", () => {
    goToTask(state.currentIndex + 1);
});

elements.healthCheckButton.addEventListener("click", async () => {
    setStatus("Checking health...");

    const url = `${normalizeBaseUrl()}/health`;
    const config = { method: "GET", headers: { Accept: "text/plain" } };

    try {
        logRequest(config.method, url, config, new Date());

        const response = await fetch(url, config);
        const text = await response.text();

        logResponse(
            config.method,
            url,
            response.status,
            response.statusText,
            text === "" ? "(empty response)" : text,
            new Date()
        );

        if (!response.ok) {
            throw new Error(text || `${response.status} ${response.statusText}`);
        }

        setStatus("Health check passed.", "success");
    } catch (error) {
        setStatus(error.message, "error");
    }
});

renderTasks();
