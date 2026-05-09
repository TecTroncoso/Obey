import { useState } from "react";
import clsx from "clsx";
import { Settings } from "lucide-react";

export function NotificationsView() {
  const [activeTab, setActiveTab] = useState<"all" | "mentions">("all");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <button className="p-2 -mr-2 rounded-full hover:bg-zinc-900 transition-colors text-white">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-zinc-800 shrink-0">
        <button
          onClick={() => setActiveTab("all")}
          className={clsx(
            "flex-1 py-4 font-bold transition-colors text-sm",
            activeTab === "all"
              ? "text-white border-b-4 border-sky-500"
              : "text-zinc-500 hover:bg-zinc-900",
          )}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab("mentions")}
          className={clsx(
            "flex-1 py-4 font-bold transition-colors text-sm",
            activeTab === "mentions"
              ? "text-white border-b-4 border-sky-500"
              : "text-zinc-500 hover:bg-zinc-900",
          )}
        >
          Mentions
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col p-8">
        <div className="max-w-sm mt-8 mx-auto w-full px-4">
          <h2 className="text-[28px] font-extrabold text-white mb-2 leading-tight">
            Nothing to see here
            <br />— yet
          </h2>
          <p className="text-zinc-500 text-[15px]">
            From likes to reposts and a whole lot more, this is where all the
            action happens.
          </p>
        </div>
      </div>
    </div>
  );
}
