import React, { createContext, useContext, useState } from 'react';
import { SessionEvent } from '../lib/types';

interface SessionContextType {
  sessionEvents: SessionEvent[];
  setSessionEvents: React.Dispatch<React.SetStateAction<SessionEvent[]>>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);

  return (
    <SessionContext.Provider value={{ sessionEvents, setSessionEvents }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};