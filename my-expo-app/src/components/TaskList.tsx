import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  requiresPhoto?: boolean;
}

const initialTasks: Task[] = [
  { id: '1', title: 'Create a presentation in Keynote', completed: false },
  { id: '2', title: 'Give feedback to the team', completed: false },
  { id: '3', title: 'Book the return tickets', completed: true },
  { id: '4', title: 'Check some guided tours', completed: true, requiresPhoto: true },
];

const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showCompleted, setShowCompleted] = useState(true);

  const pending = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-lg font-semibold text-foreground">Daily Tasks</Text>
        <Text className="font-body text-sm text-muted-foreground">
          {completed.length}/{tasks.length}
        </Text>
      </View>

      <View className="gap-2">
        {pending.map((task) => (
          <View key={task.id} className="flex-row items-center gap-3 rounded-xl border border-white/50 bg-white/75 px-4 py-3.5">
            <Pressable
              className="h-6 w-6 rounded-full border-2 border-muted-foreground/30"
              onPress={() => toggleTask(task.id)}
            />
            <Text className="flex-1 font-body text-[15px] text-foreground">{task.title}</Text>
            {task.requiresPhoto ? <Ionicons color="#6b7a90" name="camera-outline" size={16} /> : null}
          </View>
        ))}
      </View>

      {completed.length > 0 ? (
        <View>
          <Pressable className="mb-2 flex-row items-center gap-2" onPress={() => setShowCompleted((value) => !value)}>
            <Text className="font-body text-xs uppercase tracking-wider text-muted-foreground">Completed ({completed.length})</Text>
            <Ionicons color="#6b7a90" name={showCompleted ? 'chevron-up' : 'chevron-down'} size={14} />
          </Pressable>
          {showCompleted ? (
            <View className="gap-2">
              {completed.map((task) => (
                <View key={task.id} className="flex-row items-center gap-3 rounded-xl border border-white/40 bg-white/60 px-4 py-3.5 opacity-60">
                  <Pressable className="h-6 w-6 items-center justify-center rounded-full bg-success/20" onPress={() => toggleTask(task.id)}>
                    <Ionicons color="#10b981" name="checkmark" size={14} />
                  </Pressable>
                  <Text className="flex-1 font-body text-[15px] text-foreground/60 line-through">{task.title}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default TaskList;
