import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";
import { getGroupCollection } from "@/lib/groups";
import { serializeTask } from "@/types/task";
import { serializeGroup } from "@/types/group";
import { getCurrentUserId } from "@/lib/auth";
import { getUserCollection } from "@/lib/users";
import { serializeUser, UserDocument } from "@/types/user";
import TaskBoard from "@/components/TaskBoard";
import UserHeader from "@/components/UserHeader";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const [taskCol, groupCol, userCol] = await Promise.all([
    getTaskCollection(),
    getGroupCollection(),
    getUserCollection(),
  ]);
  const userObjectId = new ObjectId(userId);
  const [taskDocs, groupDocs, userDoc] = await Promise.all([
    taskCol.find({ userId: userObjectId }).sort({ order: 1 }).toArray(),
    groupCol.find({ userId: userObjectId }).sort({ order: 1 }).toArray(),
    userCol.findOne({ _id: userObjectId }),
  ]);

  if (!userDoc) {
    redirect("/login");
  }

  const initialTasks = taskDocs.map(serializeTask);
  const initialGroups = groupDocs.map(serializeGroup);
  const user = serializeUser(userDoc as UserDocument);

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

          <UserHeader user={user} />

          <TaskBoard initialTasks={initialTasks} initialGroups={initialGroups} />
        </div>
      </div>
    </main>
  );
}
