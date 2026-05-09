'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type View = 'home' | 'profile' | 'messages' | 'notifications';

interface NavContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  viewProfileUserId: string | null;
  setViewProfileUserId: (id: string | null) => void;
}

const NavContext = createContext<NavContextType>({
  currentView: 'home',
  setCurrentView: () => {},
  viewProfileUserId: null,
  setViewProfileUserId: () => {},
});

export function NavProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('home');
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);

  return (
    <NavContext.Provider value={{ currentView, setCurrentView, viewProfileUserId, setViewProfileUserId }}>
      {children}
    </NavContext.Provider>
  );
}

export const useNav = () => useContext(NavContext);
