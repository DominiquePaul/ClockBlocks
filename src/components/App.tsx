import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import TimerPage from './TimerPage';
import ChartPage from './ChartPage';
import SettingsPage from './SettingsPage';
import IconButton from './IconButton';
import { Timer, Settings, ChartColumn } from "lucide-react";
import backgroundImage from "/background.png";
import { TimeBox, SessionEvent } from "../types";



function App() {
  const [timeBoxes, setTimeBoxes] = useState<TimeBox[]>([]);
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const [overallTime, setOverallTime] = useState(0);
  const [isOverallTimerRunning, setIsOverallTimerRunning] = useState(false);
  const [activePage, setActivePage] = useState('timer');
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>([]);
  const [sessionStartDatetime, setSessionStartDatetime] = useState<Date | null>(null);

  // load saved boxes and session events from storage
  useEffect(() => {
    // Load saved boxes from storage when the app starts
    invoke<TimeBox[]>("load_boxes").then((savedBoxes) => {
      if (savedBoxes && savedBoxes.length > 0) {
        setTimeBoxes(savedBoxes);
      }
    }).catch((error) => {
      console.error("Failed to load boxes:", error);
      setTimeBoxes([
        { id: 1, name: "Read", seconds: 0, isActive: false },
        { id: 2, name: "Calls", seconds: 0, isActive: false },
        { id: 3, name: "Code", seconds: 0, isActive: false },
        { id: 4, name: "Write", seconds: 0, isActive: false },
      ]);
    });

    // Load saved sessions from storage
    invoke<SessionEvent[]>("load_sessions").then((savedSessionEvents) => {
      if (savedSessionEvents && savedSessionEvents.length > 0) {
        setSessionEvents(savedSessionEvents);
      }
    }).catch((error) => console.error("Failed to load sessions:", error));
  }, []);


  // start the overall timer
  useEffect(() => {
    // TODO: update the sessionEvent history.
    let intervalId: number | undefined;
    if (activeBox !== null) {
      if (!isOverallTimerRunning) {
        setIsOverallTimerRunning(true);
        setSessionStartDatetime(new Date());
      }
      intervalId = setInterval(() => {
        setTimeBoxes(prevBoxes =>
          prevBoxes.map(timeBox =>
            timeBox.id === activeBox
              ? { ...timeBox, seconds: timeBox.seconds + 1 }
              : timeBox
          )
        );
        setOverallTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [activeBox, isOverallTimerRunning]);


  const handleBoxClick = (id: number) => {
    setTimeBoxes(prevBoxes =>
      prevBoxes.map(box =>
        box.id === id
          ? { ...box, isActive: true }
          : { ...box, isActive: false }
      )
    );
    setActiveBox(id);
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
    // Save the session data before resetting
    if (!sessionStartDatetime) {
        alert("Ending a session, but no session was ever started");
        return;
      }
    const activeTimeBox = timeBoxes.find(box => box.isActive);
    if (!activeTimeBox) {
      console.error("No active time box found when ending session");
      return;
    }
    const session: SessionEvent = {
      sessionId: sessionEvents.length + 1,
      startDatetime: sessionStartDatetime?.toISOString(),
      endDatetime: new Date().toISOString(),
      boxId: activeTimeBox.id,
      boxTitle: activeTimeBox.name,
      seconds: activeTimeBox.seconds
    };
    
    setSessionEvents(prevSessionEvents => [...prevSessionEvents, session]);
    
    // persist session to disk
    invoke("save_session", { session })
      .then(() => console.log("Session saved successfully"))
      .catch((error) => console.error("Failed to save session:", error));

    // reset all states
    setSessionStartDatetime(null);
    setActiveBox(null);
    setOverallTime(0);
    setIsOverallTimerRunning(false);

    // reset box states
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
      {activePage === 'timer' && <TimerPage boxes={timeBoxes} handleBoxClick={handleBoxClick} formatTime={formatTime} isOverallTimerRunning={isOverallTimerRunning} overallTime={overallTime} resetAllTimers={resetAllTimers} />}
      {activePage === 'chart' && <ChartPage sessionEvents={sessionEvents} />}
      {activePage === 'settings' && <SettingsPage timeBoxes={timeBoxes} setBoxes={setTimeBoxes} />}
    </div>
  );
}

export default App;
