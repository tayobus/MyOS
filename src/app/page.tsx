import { getTaskCollection } from "@/lib/tasks";
import { getGroupCollection } from "@/lib/groups";
import { serializeTask } from "@/types/task";
import { serializeGroup } from "@/types/group";
import TaskBoard from "@/components/TaskBoard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [taskCol, groupCol] = await Promise.all([
    getTaskCollection(),
    getGroupCollection(),
  ]);
  const [taskDocs, groupDocs] = await Promise.all([
    taskCol.find().sort({ order: 1 }).toArray(),
    groupCol.find().sort({ order: 1 }).toArray(),
  ]);
  const initialTasks = taskDocs.map(serializeTask);
  const initialGroups = groupDocs.map(serializeGroup);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: "radial-gradient(#6366f1 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      ></div>

      <div className="relative z-10 flex flex-col items-center pt-20 pb-12 px-4 sm:px-6">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              My Tasks
            </h1>
          </div>

          <TaskBoard initialTasks={initialTasks} initialGroups={initialGroups} />
        </div>
      </div>
    </main>
  );
}
