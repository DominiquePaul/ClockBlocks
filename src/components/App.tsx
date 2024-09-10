import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import TimerPage from './TimerPage';
import ChartPage from './ChartPage';
import SettingsPage from './SettingsPage';
import IconButton from './IconButton';
import { Timer, Settings, ChartColumn } from "lucide-react";
import backgroundImage from "/background.png";
import { TimeBox, SessionEvent, Session } from "../types";
import { getTimeBoxes, getSessionEvents, addSessionEvent, upsertSession, maybeInitializeDatabase } from "../dbInteraction";

await maybeInitializeDatabase();

function App() {
  const [timeBoxes, setTimeBoxes] = useState<TimeBox[]>([]);
  const [activeBox, setActiveBox] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('timer');
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [activeSession, setActiveSession] = useState<Session>({
    id: uuidv4(),
    startDatetime: null,
    endDatetime: null,
    sessionEvents: [],
    duration: 0
  });
  

  // load saved boxes and session events from storage
  useEffect(() => {
    // Load saved boxes from storage when the app starts
    getTimeBoxes().then((savedBoxes) => {
      if (savedBoxes && savedBoxes.length > 0) {
        setTimeBoxes(savedBoxes);
      }
    }).catch((error) => {
      console.error("Failed to load boxes:", error);
      setTimeBoxes([]);
    });

    // Load saved sessions from storage
    getSessionEvents().then((savedSessionEvents) => {
      if (savedSessionEvents && savedSessionEvents.length > 0) {
        setSessionEvents(savedSessionEvents);
      }
    }).catch((error) => console.error("Failed to load sessions:", error));
  }, []);

  // start the overall timer when a box is clicked
  useEffect(() => {
    let intervalId: number | undefined;
    if (activeBox !== null) {
      intervalId = setInterval(() => {
        const currentTime = new Date();

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

      }, 1000);
    }
    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [activeBox]);

  
  
  const handleTimeBoxClick = (id: string) => {
    const currentTime = new Date();
    const currentTimeISO = currentTime.toISOString();

    setTimeBoxes(prevTimeBoxes =>
      prevTimeBoxes.map(timeBox =>
        timeBox.id === id
          ? { ...timeBox, isActive: true }
          : { ...timeBox, isActive: false }
      )
    );
    
    const newSessionEvent: SessionEvent = {
      id: uuidv4(),
      timeBoxId: id,
      sessionId: activeSession.id,
      startDatetime: currentTimeISO,
      endDatetime: null,
      seconds: 0
    };

    let updatedLastEvent: SessionEvent | null = null;
    const lastEvent = sessionEvents[sessionEvents.length - 1];

    if (lastEvent && !lastEvent.endDatetime) {
      updatedLastEvent = {
        ...lastEvent,
        endDatetime: currentTimeISO,
        seconds: Math.round((currentTime.getTime() - new Date(lastEvent.startDatetime).getTime()) / 1000)
      };
    }

    const updatedSessionEvents = [
      ...sessionEvents,
      ...(updatedLastEvent ? [updatedLastEvent] : []),
      newSessionEvent
    ];

    setSessionEvents(updatedSessionEvents);

    const updatedSession = {
      ...activeSession,
      startDatetime: activeSession.startDatetime || currentTimeISO,
      sessionEvents: updatedSessionEvents
    };

    setActiveSession(updatedSession);
    setActiveBox(id);

    console.log("updatedLastEvent", updatedLastEvent);
    
    // Perform database operations
    Promise.all([
      updatedLastEvent ? addSessionEvent(updatedLastEvent).then(() => console.log("Updated last event saved:", updatedLastEvent)) : Promise.resolve(),
      upsertSession(updatedSession).then(() => console.log("Session updated:", updatedSession)),
      addSessionEvent(newSessionEvent).then(() => console.log("New session event saved:", newSessionEvent))
    ]).then(() => {
      console.log("Session and events updated successfully");
    }).catch((error) => {
      console.error("Failed to update session or events:", error);
    });
  };

  const formatTime = (seconds: number) => {
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
    const updatedActiveSession = {
      ...activeSession,
      endDatetime: endDateTime.toISOString(),
      duration: activeSession.startDatetime
        ? Math.round((endDateTime.getTime() - new Date(activeSession.startDatetime).getTime()) / 1000)
        : 0,
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
    setActiveSession({
      id: uuidv4(),
      startDatetime: null,
      endDatetime: null,
      sessionEvents: [],
      duration: 0
    });

    // Reset box states
    setTimeBoxes(prevBoxes =>
      prevBoxes.map(box => ({ ...box, seconds: 0, isActive: false }))
    );
  };

  return (
    <div className="flex flex-col h-[100vh] bg-cover bg-center pt-3" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="flex flex-row justify-center items-center h-[30px] mx-auto rounded-2xl w-fit bg-[#D9D9D9]">
        <IconButton icon={Timer} onClick={() => setActivePage('timer')} isActive={activePage === 'timer'} />
        <IconButton icon={ChartColumn} onClick={() => setActivePage('chart')} isActive={activePage === 'chart'} />
        <IconButton icon={Settings} onClick={() => setActivePage('settings')} isActive={activePage === 'settings'} />
      </div>
      {activePage === 'timer' && <TimerPage boxes={timeBoxes} handleTimeBoxClick={handleTimeBoxClick} formatTime={formatTime} activeSession={activeSession} resetAllTimers={resetAllTimers} />}
      {activePage === 'chart' && <ChartPage sessionEvents={sessionEvents} timeBoxes={timeBoxes} />}
      {activePage === 'settings' && <SettingsPage timeBoxes={timeBoxes} setBoxes={setTimeBoxes} />}
    </div>
  );
}

export default App;
