import { invoke } from "@tauri-apps/api/tauri";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import TimerPage from './TimerPage';
import ChartPage from './ChartPage';
import SettingsPage from './SettingsPage';
import backgroundImage from "/background.png";
import NavigationBar from './NavigationBar';
import { TimeBox, SessionEvent, Session, AuthToken } from "../types";
import { getTimeBoxes, getSessionEvents, addSessionEvent, upsertSession, maybeInitializeDatabase } from "../dbInteraction";
import { handleSyncData } from "../writeToGSheet";
function App() {
  // State declarations
  const [timeBoxes, setTimeBoxes] = useState<TimeBox[]>([]);
  const [activeBox, setActiveBox] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('timer');
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
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
        // You might want to save the token here as well
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
      
      // Add a small delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Exchanging code for tokens...');
      const tokens: AuthToken = await invoke('exchange_code_for_tokens', { code });
      console.log('Tokens:', tokens);
      setIsAuthenticated(true);

      // Update this line to pass the correct parameters
      await invoke('save_auth_token', { 
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry
      });
      return true;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      // Add more detailed error logging
      if (typeof error === 'string') {
        console.error('Error details:', error);
      } else if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return false;
    }
  };

  

  // Effects
  useEffect(() => {
    loadInitialData();
  }, []);
  useEffect(startTimer, [activeBox]);

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
  
    const updateSessionEvents = (newEvent: SessionEvent, currentTime: Date): SessionEvent[] => {
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
  
    const saveToDatabase = (events: SessionEvent[], session: Session) => {
      const lastEvent = events[events.length - 2]; // The second-to-last event is the one we need to update
      Promise.all([
        lastEvent ? addSessionEvent(lastEvent) : Promise.resolve(),
        upsertSession(session)
      ]).then(() => {
        console.log("Session and events updated successfully");
      }).catch((error) => {
        console.error("Failed to update session or events:", error);
      });
    };

    setActiveBox(id);
    updateTimeBoxes(id);
    
    const newSessionEvent = createNewSessionEvent(id, currentTimeISO);
    const updatedSessionEvents = updateSessionEvents(newSessionEvent, currentTime);
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
    <div className="flex flex-col h-[100vh] bg-cover bg-center pt-3" style={{ backgroundImage: `url(${backgroundImage})` }}>
        <NavigationBar activePage={activePage} setActivePage={setActivePage} />
        {renderActivePage()}
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
    updateSessionEvents(currentTime);
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
      }).filter(box => !box.isHidden)
    );
  }

  function updateSessionEvents(currentTime: Date) {
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

  function renderActivePage() {
    switch (activePage) {
      case 'timer':
        return <TimerPage 
          boxes={timeBoxes.filter(box => !box.isHidden && !box.isDeleted)} 
          handleTimeBoxClick={handleTimeBoxClick} 
          formatTime={formatTime} 
          activeSession={activeSession} 
          resetAllTimers={resetAllTimers} 
        />;
      case 'chart':
        return <ChartPage sessionEvents={sessionEvents} timeBoxes={timeBoxes.filter(box => !box.isHidden)} />;
      case 'settings':
        return <SettingsPage 
          timeBoxes={timeBoxes} 
          setBoxes={setTimeBoxes} 
          isAuthenticated={isAuthenticated} 
          handleGoogleSignIn={handleGoogleSignIn}
          handleSyncData={() => handleSyncData()}
        />;
      default:
        return null;
    }
  }
}

export default App;
