import { getTaskCollection } from "@/lib/tasks";
import { serializeTask } from "@/types/task";
import TaskBoard from "@/components/TaskBoard";

export default async function Home() {
  const col = await getTaskCollection();
  const docs = await col.find().sort({ order: 1 }).toArray();
  const initialTasks = docs.map(serializeTask);

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
              오늘의 할일
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              효율적인 시간 관리를 위한 나만의 스케줄러
            </p>
          </div>
          
          <TaskBoard initialTasks={initialTasks} />
        </div>
      </div>
    </main>
  );
}
