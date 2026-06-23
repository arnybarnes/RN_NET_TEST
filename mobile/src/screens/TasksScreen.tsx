import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DEFAULT_API_BASE_URL } from '../config/api';
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from '../services/tasksApi';
import type { TaskItem, TaskStatus } from '../types/tasks';

const statuses: TaskStatus[] = ['Pending', 'InProgress', 'Completed'];

type Drafts = Record<
  string,
  {
    title: string;
    description: string;
    status: TaskStatus;
  }
>;

export function TasksScreen() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState('Loading tasks...');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadTasks(message = 'Tasks loaded.') {
    setIsLoading(true);
    setStatusMessage('Loading tasks...');

    try {
      const nextTasks = await getTasks(baseUrl);
      setTasks(nextTasks);
      setDrafts(
        Object.fromEntries(
          nextTasks.map((task) => [
            task.id,
            {
              title: task.title,
              description: task.description ?? '',
              status: task.status,
            },
          ])
        )
      );
      setStatusMessage(message);
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleCreateTask() {
    if (!title.trim()) {
      setStatusMessage('Title is required.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Creating task...');

    try {
      await createTask(
        {
          title,
          description,
        },
        baseUrl
      );
      setTitle('');
      setDescription('');
      await loadTasks('Task created.');
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateTask(taskId: string) {
    const draft = drafts[taskId];
    if (!draft) {
      return;
    }

    setStatusMessage(`Updating ${taskId}...`);

    try {
      await updateTask(
        taskId,
        {
          title: draft.title,
          description: draft.description,
          status: draft.status,
        },
        baseUrl
      );
      await loadTasks('Task updated.');
    } catch (error) {
      setStatusMessage(getErrorMessage(error));
    }
  }

  function confirmDelete(taskId: string, taskTitle: string) {
    Alert.alert('Delete task', `Delete "${taskTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setStatusMessage(`Deleting ${taskId}...`);

          try {
            await deleteTask(taskId, baseUrl);
            await loadTasks('Task deleted.');
          } catch (error) {
            setStatusMessage(getErrorMessage(error));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Azure-backed mobile client</Text>
          <Text style={styles.title}>RN Task Console</Text>
          <Text style={styles.subtitle}>
            This mobile client talks directly to the deployed Azure Functions endpoint.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Connection</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setBaseUrl}
            style={styles.input}
            value={baseUrl}
          />
          <Pressable onPress={() => loadTasks('Tasks refreshed.')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Refresh tasks</Text>
          </Pressable>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Create Task</Text>
          <TextInput
            onChangeText={setTitle}
            placeholder="Task title"
            style={styles.input}
            value={title}
          />
          <TextInput
            multiline
            onChangeText={setDescription}
            placeholder="Task description"
            style={[styles.input, styles.multilineInput]}
            textAlignVertical="top"
            value={description}
          />
          <Pressable
            disabled={isSubmitting}
            onPress={handleCreateTask}
            style={[styles.primaryButton, isSubmitting ? styles.disabledButton : null]}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Submitting...' : 'Create task'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.taskHeader}>
            <Text style={styles.panelTitle}>Tasks</Text>
            <Text style={styles.countPill}>{tasks.length}</Text>
          </View>

          {isLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color="#0f6c78" />
            </View>
          ) : tasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks returned by the API.</Text>
          ) : (
            tasks.map((task) => {
              const draft = drafts[task.id];
              if (!draft) {
                return null;
              }

              return (
                <View key={task.id} style={styles.taskCard}>
                  <Text style={styles.taskCardTitle}>{task.title}</Text>
                  <Text style={styles.metaText}>{task.id}</Text>

                  <TextInput
                    onChangeText={(value) =>
                      setDrafts((current) => ({
                        ...current,
                        [task.id]: {
                          ...current[task.id],
                          title: value,
                        },
                      }))
                    }
                    style={styles.input}
                    value={draft.title}
                  />

                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setDrafts((current) => ({
                        ...current,
                        [task.id]: {
                          ...current[task.id],
                          description: value,
                        },
                      }))
                    }
                    style={[styles.input, styles.multilineInput]}
                    textAlignVertical="top"
                    value={draft.description}
                  />

                  <View style={styles.statusRow}>
                    {statuses.map((candidate) => (
                      <Pressable
                        key={candidate}
                        onPress={() =>
                          setDrafts((current) => ({
                            ...current,
                            [task.id]: {
                              ...current[task.id],
                              status: candidate,
                            },
                          }))
                        }
                        style={[
                          styles.statusChip,
                          draft.status === candidate ? styles.statusChipActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            draft.status === candidate ? styles.statusChipTextActive : null,
                          ]}
                        >
                          {candidate}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => handleUpdateTask(task.id)}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.primaryButtonText}>Save</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(task.id, task.title)}
                      style={styles.dangerButton}
                    >
                      <Text style={styles.dangerButtonText}>Delete</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.metaText}>
                    Created: {formatTimestamp(task.createdAt)}
                  </Text>
                  <Text style={styles.metaText}>
                    Updated: {formatTimestamp(task.updatedAt)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef4f7',
  },
  container: {
    padding: 20,
    gap: 18,
  },
  hero: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
  },
  eyebrow: {
    color: '#0f6c78',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#18222a',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: '#5d6b75',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  panelTitle: {
    color: '#18222a',
    fontSize: 22,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f5fafc',
    borderColor: '#c9d9e2',
    borderRadius: 12,
    borderWidth: 1,
    color: '#18222a',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 92,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f6c78',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#f7fdff',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  statusText: {
    color: '#5d6b75',
    fontSize: 14,
    lineHeight: 20,
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countPill: {
    backgroundColor: '#f5fafc',
    borderRadius: 999,
    color: '#5d6b75',
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#5d6b75',
    fontSize: 15,
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#f9fcfd',
    borderColor: '#d8e6ed',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  taskCardTitle: {
    color: '#18222a',
    fontSize: 18,
    fontWeight: '700',
  },
  metaText: {
    color: '#64717b',
    fontSize: 12,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    backgroundColor: '#e7f1f5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipActive: {
    backgroundColor: '#0f6c78',
  },
  statusChipText: {
    color: '#36505a',
    fontSize: 12,
    fontWeight: '700',
  },
  statusChipTextActive: {
    color: '#f7fdff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#9c2e1b',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerButtonText: {
    color: '#fff6f3',
    fontWeight: '700',
  },
});
