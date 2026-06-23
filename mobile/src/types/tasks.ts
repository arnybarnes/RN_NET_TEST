export type TaskStatus = 'Pending' | 'InProgress' | 'Completed';

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskRequest = {
  title: string;
  description?: string;
};

export type UpdateTaskRequest = {
  title: string;
  description?: string;
  status: TaskStatus;
};
