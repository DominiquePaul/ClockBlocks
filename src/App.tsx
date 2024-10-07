import { invoke } from "@tauri-apps/api/tauri";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import TimerPage from './pages/TimerPage';
import ChartPage from './pages/ChartPage';
import SettingsPage from './pages/SettingsPage';
import NavigationBar from './components/NavigationBar';
import { TimeBox, SessionEvent, Session, AuthToken } from "./lib/types";
import { getTimeBoxes, getSessionEvents, addSessionEvent, upsertSession, maybeInitializeDatabase, startTransaction, commitTransaction, rollbackTransaction } from "./lib/dbInteraction";
import { handleSyncData } from "./lib/writeToGSheet";
import RoundedBox from "./components/RoundedBox";
import { SessionProvider, useSession } from './context/SessionContext';

function AppContent() {
  const { sessionEvents, setSessionEvents } = useSession();

  // State declarations
  const [timeBoxes, setTimeBoxes] = useState<TimeBox[]>([]);
  const [activeBox, setActiveBox] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('timer');
  const [activeSession, setActiveSession] = useState<Session>(createNewSession());
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const isValid = await checkAuthStatus();
      setIsAuthenticated(isValid);
    };
    initAuth();

    const handleAuthResponse = (event: MessageEvent) => {
      if (event.origin === 'http://localhost:3010' && event.data.type === 'GOOGLE_SIGN_IN_SUCCESS') {
        setIsAuthenticated(true);
        invoke('save_auth_token', { 
          accessToken: event.data.accessToken, 
          refreshToken: event.data.refreshToken, 
          expiry: event.data.expiry 
        });
      }
    };

    window.addEventListener('message', handleAuthResponse);
    return () => window.removeEventListener('message', handleAuthResponse);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isValid = await invoke('check_auth_token');
      return isValid as boolean;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  };

  const handleGoogleSignIn = async (): Promise<boolean> => {
    try {
      console.log('Starting Google Sign-In...');
      const code: string = await invoke('start_google_sign_in');
      console.log('Received authorization code:', code);
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Exchanging code for tokens...');
      const tokens: AuthToken = await invoke('exchange_code_for_tokens', { code });
      console.log('Tokens:', tokens);
      setIsAuthenticated(true);

      await invoke('save_auth_token', { 
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry
      });
      return true;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      return false;
    }
  };

  // Effects
  useEffect(() => {
    loadInitialData();
  }, []);
  useEffect(startTimer, [activeBox]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        switch (event.key) {
          case '1':
            setActivePage('timer');
            event.preventDefault();
            break;
          case '2':
            setActivePage('chart');
            event.preventDefault();
            break;
          case '3':
            setActivePage('settings');
            event.preventDefault();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Event handlers
  const handleTimeBoxClick = (id: string) => {
    const currentTime = new Date();
    const currentTimeISO = currentTime.toISOString();

    const updateTimeBoxes = (activeId: string) => {
      setTimeBoxes(prevTimeBoxes =>
        prevTimeBoxes.map(timeBox => ({
          ...timeBox,
          isActive: timeBox.id === activeId
        }))
      );
    };

    const createNewSessionEvent = (timeBoxId: string, startTime: string): SessionEvent => ({
      id: uuidv4(),
      timeBoxId,
      sessionId: activeSession.id,
      startDatetime: startTime,
      endDatetime: null,
      seconds: 0
    });

    const updateSessionEventsOnBoxClick = (newEvent: SessionEvent, currentTime: Date): SessionEvent[] => {
      const lastEvent = sessionEvents[sessionEvents.length - 1];
      if (activeBox && lastEvent) {
        const updatedLastEvent = {
          ...lastEvent,
          endDatetime: currentTime.toISOString(),
          seconds: Math.round((currentTime.getTime() - new Date(lastEvent.startDatetime).getTime()) / 1000)
        };
        return [...sessionEvents.slice(0, -1), updatedLastEvent, newEvent];
      }
      return [...sessionEvents, newEvent];
    };

    const updateSession = (events: SessionEvent[], currentTimeISO: string): Session => ({
      ...activeSession,
      startDatetime: activeSession.startDatetime || currentTimeISO,
      sessionEvents: events
    });

    const saveToDatabase = async (events: SessionEvent[], session: Session) => {
      const lastEvent = events[events.length - 2];
      let db;
      try {
        db = await startTransaction();
        if (lastEvent) {
          await addSessionEvent(lastEvent, db);
        }
        await upsertSession(session, db);
        await commitTransaction(db);
        console.log("Session and events updated successfully");
      } catch (error) {
        if (db) {
          await rollbackTransaction(db);
        }
        console.error("Failed to update session or events:", error);
      }
    };

    setActiveBox(id);
    updateTimeBoxes(id);
    
    const newSessionEvent = createNewSessionEvent(id, currentTimeISO);
    const updatedSessionEvents = updateSessionEventsOnBoxClick(newSessionEvent, currentTime);
    const updatedSession = updateSession(updatedSessionEvents, currentTimeISO);
    
    setSessionEvents(updatedSessionEvents);
    setActiveSession(updatedSession);
    
    saveToDatabase(updatedSessionEvents, updatedSession);
  };

  const resetAllTimers = () => {
    console.log("resetAllTimers");
    const activeTimeBox = timeBoxes.find(box => box.isActive);
    if (!activeTimeBox) {
      console.error("No active time box found when ending session");
      return;
    }

    const endDateTime = new Date();

    // Update the last session event
    const updatedSessionEvents = sessionEvents.map((event, index) => {
      if (index === sessionEvents.length - 1 && !event.endDatetime) {
        return {
          ...event,
          endDatetime: endDateTime.toISOString(),
          seconds: Math.round((endDateTime.getTime() - new Date(event.startDatetime).getTime()) / 1000)
        };
      }
      return event;
    });

    // Update the active session
    if (!activeSession.startDatetime) {
      throw new Error("Active session is missing startDatetime");
    }
    const updatedActiveSession = {
      ...activeSession,
      endDatetime: endDateTime.toISOString(),
      duration: Math.round((endDateTime.getTime() - new Date(activeSession.startDatetime).getTime()) / 1000),
      sessionEvents: updatedSessionEvents
    };

    // Persist updated session event to disk
    const lastUpdatedEvent = updatedSessionEvents[updatedSessionEvents.length - 1];
    addSessionEvent(lastUpdatedEvent)
    .then(() => console.log("Session event saved successfully"))
    .catch((error) => console.error("Failed to save session event:", error));
    
    // Persist updated session to disk
    upsertSession(updatedActiveSession)
      .then(() => console.log("Session updated successfully"))
      .catch((error) => console.error("Failed to update session:", error));

    setSessionEvents(updatedSessionEvents);
    setActiveBox(null);
    setActiveSession(createNewSession());

    // Reset box states
    setTimeBoxes(prevBoxes =>
      prevBoxes.map(box => ({ ...box, seconds: 0, isActive: false }))
    );
  };

  // Render
  return (
    <div className="bg-black min-h-screen flex flex-col overflow-hidden">
      <div className="flex-grow flex flex-col w-full items-center overflow-auto mb-3 pt-min-[20px] pt-[6vh]">
        <NavigationBar activePage={activePage} setActivePage={setActivePage} />
        <div className="flex flex-col justify-start items-center gap-[10px] w-auto mx-auto bg-[#232323] rounded-xl min-w-[400px] p-3">
          {activePage === 'timer' && (
            <TimerPage 
              boxes={timeBoxes.filter(box => !box.isHidden && !box.isDeleted)} 
              handleTimeBoxClick={handleTimeBoxClick} 
              formatTime={formatTime} 
            />
          )}
          {activePage === 'chart' && (
            <ChartPage 
              timeBoxes={timeBoxes.filter(box => !box.isHidden)}
            />
          )}
          {activePage === 'settings' && (
              <SettingsPage 
                timeBoxes={timeBoxes} 
                setBoxes={setTimeBoxes} 
                isAuthenticated={isAuthenticated} 
                handleGoogleSignIn={handleGoogleSignIn}
                handleSyncData={() => handleSyncData()}
              />
          )}
        </div>
        {activePage === 'timer' && (
          <RoundedBox roundedCorners="top" className={`${activeSession.startDatetime ? 'visible' : 'invisible'}`}>
            <button 
              onClick={resetAllTimers} 
              className={`flex flex-row justify-center items-center mx-auto w-fit px-4 py-2 bg-[#232323] rounded-b-xl`}
            >
              <div className="flex items-start gap-[10px]">
                <div className="flex w-[35px] h-[35px] p-[9px] justify-center items-center gap-[15px] self-stretch rounded-[8px] bg-white backdrop-blur-[2.3px]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 13 13" fill="none">
                    <path d="M2.36389 2.36414L10.8341 2.36414L10.8341 10.8343L2.36389 10.8343L2.36389 2.36414Z" fill="black" stroke="black" strokeWidth="2.25871" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <p className="px-2 text-center leading-trim text-edge-cap font-tt-hoves-pro-trial-variable text-[15px] font-[493] leading-normal tracking-[-0.3px] text-[#E8E8E8] w-20">{formatTime(activeSession.duration)}</p>
            </button>
          </RoundedBox>
        )}
      </div>
    </div>
  );

  // Helper functions
  async function loadInitialData() {
    await maybeInitializeDatabase();
    loadTimeBoxes();
    loadSessionEvents();
  }

  function loadTimeBoxes() {
    getTimeBoxes()
      .then((savedBoxes) => {
        if (savedBoxes && savedBoxes.length > 0) {
          setTimeBoxes(savedBoxes);
        }
      })
      .catch((error) => {
        console.error("Failed to load boxes:", error);
        setTimeBoxes([]);
      });
  }

  function loadSessionEvents() {
    getSessionEvents()
      .then((savedSessionEvents) => {
        if (savedSessionEvents && savedSessionEvents.length > 0) {
          setSessionEvents(savedSessionEvents);
        }
      })
      .catch((error) => console.error("Failed to load sessions:", error));
  }

  function startTimer() {
    if (activeBox === null) return;

    const intervalId = setInterval(updateTimers, 1000);
    return () => clearInterval(intervalId);
  }

  function updateTimers() {
    const currentTime = new Date();
    updateTimeBoxes(currentTime);
    updateOngoingSessionEvent(currentTime);
    updateActiveSession(currentTime);
  }

  function updateTimeBoxes(currentTime: Date) {
    setTimeBoxes(prevBoxes =>
      prevBoxes.map(timeBox => {
        const relevantEvents = sessionEvents.filter(event => 
          event.timeBoxId === timeBox.id && event.sessionId === activeSession.id
        );
        const totalSeconds = relevantEvents.reduce((total, event) => {
          const startTime = new Date(event.startDatetime).getTime();
          const endTime = event.endDatetime ? new Date(event.endDatetime).getTime() : currentTime.getTime();
          return total + Math.round((endTime - startTime) / 1000);
        }, 0);
        return {
          ...timeBox,
          seconds: totalSeconds,
        };
      })
    );
  }

  function updateOngoingSessionEvent(currentTime: Date) {
    setSessionEvents(prevEvents => {
      const updatedEvents = [...prevEvents];
      const lastEvent = updatedEvents[updatedEvents.length - 1];
      
      if (lastEvent && !lastEvent.endDatetime) {
        const elapsedSeconds = Math.round((currentTime.getTime() - new Date(lastEvent.startDatetime).getTime()) / 1000);
        
        updatedEvents[updatedEvents.length - 1] = {
          ...lastEvent,
          seconds: elapsedSeconds
        };
      }
      
      return updatedEvents;
    });
  }

  function updateActiveSession(currentTime: Date) {
    setActiveSession(prevSession => {
      if (prevSession.startDatetime) {
        const sessionDuration = Math.round((currentTime.getTime() - new Date(prevSession.startDatetime).getTime()) / 1000);
        return {
          ...prevSession,
          duration: sessionDuration
        };
      }
      return prevSession;
    });
  }

  function formatTime(seconds: number) {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  function createNewSession(): Session {
    return {
      id: uuidv4(),
      startDatetime: null,
      endDatetime: null,
      sessionEvents: [],
      duration: 0
    };
  }
}

function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

export default App;