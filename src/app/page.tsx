import { getTaskCollection } from "@/lib/tasks";
import { serializeTask } from "@/types/task";
import TaskBoard from "@/components/TaskBoard";

export default async function Home() {
  const col = await getTaskCollection();
  const docs = await col.find().sort({ order: 1 }).toArray();
  const initialTasks = docs.map(serializeTask);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100">
          할일 목록
        </h1>
        <TaskBoard initialTasks={initialTasks} />
      </div>
    </main>
  );
}
