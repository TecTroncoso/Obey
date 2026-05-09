"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { NavProvider, useNav } from "@/lib/nav-context";
import { Login } from "@/components/login";
import { ProfileSetup } from "@/components/profile-setup";
import { Feed } from "@/components/feed";
import { TrendsWidget } from "@/components/trends";
import { SearchWidget } from "@/components/search-widget";
import { MessagesWidget } from "@/components/messages-widget";
import { ProfileView } from "@/components/profile";
import { MessagesView } from "@/components/messages";
import { NotificationsView } from "@/components/notifications";
import { PostModal } from "@/components/post-modal";
import {
  Loader2,
  LogOut,
  Home,
  Hash,
  Bell,
  Mail,
  Bookmark,
  List,
  User as UserIcon,
  MoreHorizontal,
  PenTool,
} from "lucide-react";
import clsx from "clsx";

function AppContent() {
  const { user, dbUser, loading, signOut } = useAuth();
  const { currentView, setCurrentView, setViewProfileUserId } = useNav();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!dbUser || !dbUser.username) {
    return <ProfileSetup />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl justify-center bg-zinc-950 text-zinc-200">
      <nav className="w-64 border-r border-zinc-800 flex-col py-6 px-4 hidden lg:flex h-screen sticky top-0 shrink-0">
        <div className="mb-8 px-2">
          <button onClick={() => setCurrentView("home")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(155,27,27,0.4)]">
              <span className="font-bold text-white">N</span>
            </div>
          </button>
        </div>

        <div className="space-y-2 flex-grow">
          <button
            onClick={() => setCurrentView("home")}
            className={clsx(
              "flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full transition-colors",
              currentView === "home"
                ? "font-bold text-white"
                : "text-zinc-200 hover:bg-zinc-900",
            )}
          >
            <Home className="w-7 h-7" /> Home
          </button>
          <button className="flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full text-zinc-200 hover:bg-zinc-900 transition-colors">
            <Hash className="w-7 h-7" /> Explore
          </button>
          <button
            onClick={() => setCurrentView("notifications")}
            className={clsx(
              "flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full transition-colors",
              currentView === "notifications"
                ? "font-bold text-white"
                : "text-zinc-200 hover:bg-zinc-900",
            )}
          >
            <Bell className="w-7 h-7" /> Notifications
          </button>
          <button
            onClick={() => setCurrentView("messages")}
            className={clsx(
              "flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full transition-colors",
              currentView === "messages"
                ? "font-bold text-white"
                : "text-zinc-200 hover:bg-zinc-900",
            )}
          >
            <Mail className="w-7 h-7" /> Messages
          </button>
          <button className="flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full text-zinc-200 hover:bg-zinc-900 transition-colors">
            <Bookmark className="w-7 h-7" /> Bookmarks
          </button>
          <button className="flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full text-zinc-200 hover:bg-zinc-900 transition-colors">
            <List className="w-7 h-7" /> Lists
          </button>
          <button
            onClick={() => {
              setViewProfileUserId(null);
              setCurrentView("profile");
            }}
            className={clsx(
              "flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full transition-colors",
              currentView === "profile"
                ? "font-bold text-white"
                : "text-zinc-200 hover:bg-zinc-900",
            )}
          >
            <UserIcon className="w-7 h-7" /> Profile
          </button>
          <button className="flex items-center gap-4 text-xl w-full px-4 py-3 rounded-full text-zinc-200 hover:bg-zinc-900 transition-colors">
            <MoreHorizontal className="w-7 h-7" /> More
          </button>

          <button
            onClick={() => setIsPostModalOpen(true)}
            className="mt-4 w-[90%] bg-rose-500 py-4 rounded-full text-white font-bold text-xl hover:bg-rose-600 transition-colors shadow-lg"
          >
            Post
          </button>
        </div>

        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 p-3 rounded-full text-white hover:bg-zinc-900 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
            {dbUser.photoUrl ? (
              <img
                src={dbUser.photoUrl}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold">
                {dbUser.displayName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col text-left truncate min-w-0">
            <span className="font-bold text-sm truncate">
              {dbUser.displayName}
            </span>
            <span className="text-zinc-500 text-sm truncate">
              @{dbUser.username}
            </span>
          </div>
        </button>
      </nav>

      <main className="flex-1 flex flex-col border-x xl:border-r xl:border-l-0 border-zinc-800 min-h-screen min-w-0 w-full overflow-hidden">
        {currentView === "home" && <Feed />}
        {currentView === "profile" && <ProfileView />}
        {currentView === "messages" && <MessagesView />}
        {currentView === "notifications" && <NotificationsView />}
      </main>

      <aside className="w-80 p-6 flex-col gap-6 hidden xl:flex h-screen sticky top-0 shrink-0">
        <SearchWidget />
        <TrendsWidget />
        <footer className="mt-auto text-[10px] text-zinc-600 leading-relaxed">
          Nodes Privacy • Protocol • Safety Center • Transparency • © 2026 Nodes
          Inc.
        </footer>
      </aside>

      <MessagesWidget />

      <PostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <NavProvider>
      <AppContent />
    </NavProvider>
  );
}
