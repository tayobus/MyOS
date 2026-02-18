import { getTaskCollection } from "@/lib/tasks";
import { serializeTask } from "@/types/task";
import TaskBoard from "@/components/TaskBoard";

export default async function Home() {
  const col = await getTaskCollection();
  const docs = await col.find().sort({ order: 1 }).toArray();
  const initialTasks = docs.map(serializeTask);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800 dark:text-gray-100">
          할일 목록
        </h1>
      </div>
      <TaskBoard initialTasks={initialTasks} />
    </main>
  );
}
