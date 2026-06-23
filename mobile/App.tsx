import { StatusBar } from 'expo-status-bar';

import { TasksScreen } from './src/screens/TasksScreen';

export default function App() {
  return (
    <>
      <TasksScreen />
      <StatusBar style="dark" />
    </>
  );
}
