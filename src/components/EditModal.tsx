import React from 'react';
import { X } from 'lucide-react'; // Import the X icon from Lucide
import PrimaryButton from './PrimaryButton';
import Dropdown from './DropDownButton';
import { useState, useEffect } from 'react';
import { getSessionEvents, getTimeBoxes, upsertSessionEvent, deleteSessionEvent, startTransaction, commitTransaction, rollbackTransaction } from '../lib/dbInteraction';
import { SessionEvent, TimeBox } from '../lib/types';
import { useSession } from '../context/SessionContext';


interface TextItemProps {
  content: string;
  isInput: boolean;
  onChange?: (value: string) => void;
}



function getFirstAndLastEventDatetime(selectedSessionEvents: SessionEvent[]) {
    const eventStartTimes = selectedSessionEvents.map(event => new Date(event.startDatetime));
    const eventEndTimes = selectedSessionEvents.map(event => new Date(event.endDatetime || new Date().toISOString()));
    const firstEventStart = new Date(Math.min(...eventStartTimes.map(date => date.getTime())));
    const lastEventEnd = new Date(Math.max(...eventEndTimes.map(date => date.getTime())));
    return { firstEventStart, lastEventEnd };
}


function doesOverlapExist(candidateStart: Date, candidateEnd: Date, firstEventStart: Date, lastEventEnd: Date){
    if (candidateStart > lastEventEnd || candidateEnd < firstEventStart){
        return false;
    }
    return true;
}

function timeStringToDate(timeStringStart: string, timeStringEnd: string, selectedSessionEvents: SessionEvent[]): [Date | null, Date | null] {
  console.log("Starting timeStringToDate function");
  console.log("Input - timeStringStart:", timeStringStart, "timeStringEnd:", timeStringEnd);
  
  const { firstEventStart, lastEventEnd } = getFirstAndLastEventDatetime(selectedSessionEvents);
  console.log("First event start (UTC):", firstEventStart.toUTCString(), "Last event end (UTC):", lastEventEnd.toUTCString());
  
  const parseTime = (timeString: string): [number, number] => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return [hours, minutes];
  };

  let [hoursStart, minutesStart] = parseTime(timeStringStart);
  let [hoursEnd, minutesEnd] = parseTime(timeStringEnd);
  console.log("Parsed times - Start:", hoursStart, ":", minutesStart, "End:", hoursEnd, ":", minutesEnd);

  const createDate = (baseDate: Date, hours: number, minutes: number): Date => {
    const date = new Date(baseDate);
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
  };

  const adjustDateIfNeeded = (date: Date, referenceDate: Date): Date => {
    if (date < referenceDate) {
      date.setUTCDate(date.getUTCDate() + 1);
      console.log("Date adjusted to next day (UTC):", date.toUTCString());
    }
    return date;
  };
  
  // Get the delta in hours between the current timezone and UTC
  const getTimezoneOffset = (): number => {
    const now = new Date();
    const offsetMinutes = now.getTimezoneOffset();
    return -offsetMinutes / 60; // Convert to hours and invert the sign
  };

  const timezoneOffsetHours = getTimezoneOffset();
  console.log("Timezone offset (hours):", timezoneOffsetHours);

  hoursStart = (hoursStart - timezoneOffsetHours + 24) % 24;
  hoursEnd = (hoursEnd - timezoneOffsetHours + 24) % 24;
  console.log("Adjusted start and end hours:", hoursStart, hoursEnd);

  // Try creating dates based on the first event start
  let startDate = createDate(firstEventStart, hoursStart, minutesStart);
  let endDate = createDate(firstEventStart, hoursEnd, minutesEnd);
  console.log("Initial dates - Start (UTC):", startDate.toUTCString(), "End (UTC):", endDate.toUTCString());

  // If end time is earlier than start time, assume it's the next day
  if (endDate <= startDate) {
    endDate = adjustDateIfNeeded(endDate, startDate);
    console.log("End date adjusted (UTC):", endDate.toUTCString());
  }

  // Check if the time range overlaps with the existing events
  if (!doesOverlapExist(startDate, endDate, firstEventStart, lastEventEnd)) {
    console.log("No overlap found, trying to shift dates");
    // If no overlap, try shifting both dates back by one day
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
    console.log("Shifted dates back - Start (UTC):", startDate.toUTCString(), "End (UTC):", endDate.toUTCString());

    // If still no overlap, try shifting both dates forward by one day from the original position
    if (!doesOverlapExist(startDate, endDate, firstEventStart, lastEventEnd)) {
      console.log("Still no overlap, shifting dates forward");
      startDate = createDate(firstEventStart, hoursStart, minutesStart);
      endDate = createDate(firstEventStart, hoursEnd, minutesEnd);
      startDate.setUTCDate(startDate.getUTCDate() + 1);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      if (endDate <= startDate) {
        endDate = adjustDateIfNeeded(endDate, startDate);
      }
      console.log("Final shifted dates - Start (UTC):", startDate.toUTCString(), "End (UTC):", endDate.toUTCString());
    }
  }

  // Final check for overlap
  if (doesOverlapExist(startDate, endDate, firstEventStart, lastEventEnd)) {
    console.log("Overlap found, returning dates - Start (UTC):", startDate.toUTCString(), "End (UTC):", endDate.toUTCString());
    return [startDate, endDate];
  } else {
    console.log("No overlap found after all attempts, returning null");
    return [null, null];
  }
}

const TextItem: React.FC<TextItemProps> = ({ content, isInput, onChange }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'];
    const isNumber = /^[0-9]$/.test(e.key);
    const isColon = e.key === ':';

    if (!isNumber && !isColon && !allowedKeys.includes(e.key)) {
      e.preventDefault();
      console.log("Key prevented:", e.key);
    }
  };

//   console.log("Rendering TextItem - isInput:", isInput, "content:", content);

  return (
    <div className={`flex w-[50px] p-1 items-center justify-center rounded-md ${isInput ? 'bg-[#191919]' : ''}`}>
      {isInput ? (
        <input
          type="text"
          placeholder="HH:MM"
          value={content.slice(0, 5)} // Restrict length to 5 characters
          onChange={(e) => {
            console.log("Input changed:", e.target.value);
            onChange && onChange(e.target.value.slice(0, 5));
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-[#D9D9D9] text-sm font-normal leading-normal outline-none text-center"
        />
      ) : (
        <p className="text-[#D9D9D9] leading-trim text-edge-cap text-sm font-normal leading-normal text-center">{content}</p>
      )}
    </div>
  );
};

interface SessionItemProps {
  title: string;
  start: string;
  end: string;
}

const formatTimeFromISO = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const SessionItem: React.FC<SessionItemProps> = ({ title, start, end }) => {
  return (
    <div className="flex justify-between items-center self-stretch">
      <p className="text-[#D9D9D9] leading-trim text-edge-cap  text-sm font-normal leading-normal">{title}</p>
      <div className="flex items-center gap-2">
        <TextItem content={formatTimeFromISO(start)} isInput={false} />
        <p className="text-[#D9D9D9] text-center leading-trim text-edge-cap  text-sm font-normal leading-normal">-</p>
        <TextItem content={formatTimeFromISO(end)} isInput={false} />
      </div>
    </div>
  );
};

interface EditModalProps {
    onClose: () => void;
    sessionId: string;
    sessionStart: string;
    sessionNumber: string;
}

const EditModal: React.FC<EditModalProps> = ({ sessionId, sessionStart, sessionNumber, onClose }) => {
    // console.log("Session ID", sessionId);
    const { setSessionEvents } = useSession();
    const [fromTime, setFromTime] = useState("n/a");
    const [toTime, setToTime] = useState("n/a");
    const [selectedTimeBoxId, setSelectedTimeBoxId] = useState<string>(''); // State for selected time box
    const [selectedSessionEvents, setSelectedSessionEvents] = useState<(SessionEvent & { timeBoxName: string })[]>([]);
    
    const [timeBoxes, setTimeBoxes] = useState<TimeBox[]>([]); // State for timeboxes
    const [warningMessage, setWarningMessage] = useState<string>('');
    const [isButtonActiveState, setIsButtonActiveState] = useState(false);

    useEffect(() => {
        console.log("Effect: load timeboxes");
        const loadTimeBoxes = async () => {
            const boxes = await getTimeBoxes();
            setTimeBoxes(boxes);
        };
        loadTimeBoxes();
        console.log("Loaded timeboxes");
    }, []);

    useEffect(() => {
        console.log("Effect: load sessions");
        const loadSessionEvents = async () => {
            const events = await getSessionEvents();
            const filteredEvents = events.filter(event => event.sessionId === sessionId)
                .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())
                .map(event => {
                    const timeBox = timeBoxes.find(box => box.id === event.timeBoxId);
                    return {
                        ...event,
                        timeBoxName: timeBox ? timeBox.name : 'Unknown'
                    };
                });

            setSelectedSessionEvents(filteredEvents);
        };

        loadSessionEvents();
    }, [sessionId, timeBoxes]);

    useEffect(() => {
        console.log("Effect: fromTime and toTime");
        if (selectedSessionEvents.length > 0) {
            if (fromTime === "n/a") {
                setFromTime(formatTimeFromISO(selectedSessionEvents[0].startDatetime));
            }
            if (toTime === "n/a") {
                const lastEvent = selectedSessionEvents[selectedSessionEvents.length - 1];
                setToTime(lastEvent.endDatetime ? formatTimeFromISO(lastEvent.endDatetime) : "23:59");
            }
        }
    }, [selectedSessionEvents, fromTime, toTime]);

    useEffect(() => {
        const checkButtonActive = () => {
            if (!selectedTimeBoxId) {
                setWarningMessage('Please select a time box to reassign time frame too.');
                setIsButtonActiveState(false);
                return;
            }
            
            // Check if both fromTime and toTime are complete
            if (!fromTime || !toTime || fromTime.length < 4 || toTime.length < 4) {
                console.log("From-time to-time not long enough.");
                setIsButtonActiveState(false);
                // setWarningMessage('');
                return;
            }
            const isValidTimeFormat = (time: string): boolean => {
                const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
                return timePattern.test(time);
            };

            if (!isValidTimeFormat(fromTime) || !isValidTimeFormat(toTime)) {
                setWarningMessage('Invalid time format. Please use HH:MM format.');
                setIsButtonActiveState(false);
                return;
            }
            const [enteredStartTime, enteredEndTime] = timeStringToDate(fromTime, toTime, selectedSessionEvents);

            if (enteredStartTime === null || enteredEndTime === null){
                setWarningMessage('Invalid time range. New time must overlap.');
                setIsButtonActiveState(false);
                return;
            } else {
                setWarningMessage('');
                setIsButtonActiveState(true);
            }
        };

        checkButtonActive();
    }, [selectedTimeBoxId, fromTime, toTime, selectedSessionEvents]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && isButtonActiveState) {
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isButtonActiveState]);

    const handleSave = async () => {
        let eventIdsToDelete: string[] = [];
        let eventsToUpdate: SessionEvent[] = [];
        let newEvents: SessionEvent[] = [];

        const [startDatetime, endDatetime] = timeStringToDate(fromTime, toTime, selectedSessionEvents);
        console.log("Overwrite:     Start datetime:", startDatetime, " | ", "End datetime:", endDatetime, " | ", "Selected timebox ID:", selectedTimeBoxId);
        if (!startDatetime || !endDatetime) {
            console.error("Start and end datetime cannot be null.");
            return;
        }

        selectedSessionEvents.forEach(event => {
            const eventStartDatetime = new Date(event.startDatetime);
            const eventEndDatetime = new Date(event.endDatetime || new Date().toISOString());

            // case: event end < new start => do nothing
            if (eventEndDatetime <= startDatetime) {
                // No action needed for this case
            }
            
            // case: event start is before new start and event end is after new start AND before new end -> edit event to end at new start
            else if (eventStartDatetime < startDatetime && eventEndDatetime < endDatetime) {
                eventsToUpdate.push({ ...event, endDatetime: startDatetime.toISOString() });
            }
            // case: event start is after new start and event end is before new end -> delete event
            else if (eventStartDatetime >= startDatetime && eventEndDatetime <= endDatetime) {
                eventIdsToDelete.push(event.id);
            }
            // case: event start is before new start and event end is after new end -> edit end to new start and create new event with start at new start and end at old event end
            else if (eventStartDatetime < startDatetime && eventEndDatetime > endDatetime) {
                eventsToUpdate.push({ ...event, endDatetime: startDatetime.toISOString(), timeBoxId: selectedTimeBoxId });
                newEvents.push({ ...event, startDatetime: endDatetime.toISOString() });
            }
            // case: event start is before new end and event end is after new end -> edit event to start at new end
            else if (eventStartDatetime < endDatetime && eventEndDatetime > endDatetime) {
                eventsToUpdate.push({ ...event, startDatetime: endDatetime.toISOString() });
            }
            // case: event start is after new end -> do nothing
            else if (eventStartDatetime >= endDatetime) {
                // No action needed for this case
            }
            else {
                console.warn("No condition met for event", event, ". This is not supposed to happen.");
            }
        });

        // Add the newly created event to the new events array
        newEvents.push({ id: '', startDatetime: startDatetime.toISOString(), endDatetime: endDatetime.toISOString(), timeBoxId: selectedTimeBoxId, sessionId: selectedSessionEvents[0].sessionId, seconds: -1 });

        // Calculate duration in seconds
        const calculateDuration = (start: string, end: string) => {
            const updatedEventStart = new Date(start || '');
            const updatedEventEnd = new Date(end || '');
            
            if (!isNaN(updatedEventStart.getTime()) && !isNaN(updatedEventEnd.getTime())) {
                const durationInSeconds = (updatedEventEnd.getTime() - updatedEventStart.getTime()) / 1000;
                return durationInSeconds;
            } else {
                console.warn(`Invalid date for start: ${start}, end: ${end}`);
                return null;
            }
        };

        // Add new duration to eventsToUpdate
        eventsToUpdate.forEach((event, index) => {
            const seconds = calculateDuration(event.startDatetime, event.endDatetime || new Date().toISOString());
            if (seconds !== null) {
                // console.log(`Event ID: ${event.id}, Duration: ${seconds} seconds`);
                eventsToUpdate[index] = { ...event, seconds: seconds }; // Update the original array with the duration
            }
        });

        // Add new duration to newEvents
        newEvents.forEach((event, index) => {
            const seconds = calculateDuration(event.startDatetime, event.endDatetime || new Date().toISOString());
            if (seconds !== null) {
                // console.log(`New TimeBoxID: ${event.timeBoxId}, Duration: ${seconds} seconds`);
                newEvents[index] = { ...event, seconds: seconds }; // Update the new events array with the duration
            }
        });

        // log to check if everythingis correct
        // console.log("Events to update", eventsToUpdate);
        // console.log("Events to delete", eventIdsToDelete);
        // console.log("New events", newEvents);
        
        let transaction;
        try {
            // Start a transaction and get the transaction object
            transaction = await startTransaction();

            // Perform all database operations within the transaction
            for (const event of eventsToUpdate) {
                await upsertSessionEvent(event, transaction);
            }

            for (const id of eventIdsToDelete) {
                await deleteSessionEvent(id, transaction);
            }

            for (const event of newEvents) {
                await upsertSessionEvent(event, transaction);
            }

            // Commit the transaction
            await commitTransaction(transaction);

            // After successful transaction, fetch updated events
            const updatedEvents = await getSessionEvents();

            // Update the selected session events being shown and reset the dropdown, from time, and to time
            const filteredEvents = updatedEvents
                .filter(event => event.sessionId === sessionId)
                .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())
                .map(event => ({ ...event, timeBoxName: timeBoxes.find(box => box.id === event.timeBoxId)?.name || 'Unknown' }));
            
            setSessionEvents(updatedEvents);
            setSelectedSessionEvents(filteredEvents);
            setSelectedTimeBoxId('');

        } catch (error) {
            console.error("Error during save operation:", error);
            // If there's an error, roll back the transaction
            if (transaction) {
                await rollbackTransaction(transaction);
            }
            // Optionally, you can add some user feedback here
        }
    };

    return (
        <div className="flex p-6 pb-1 flex-col items-center rounded-2xl bg-black backdrop-blur-[40px] w-[420px] border border-[#5E5E5E] border-opacity-30 max-h-[90vh] overflow-y-auto relative">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
                aria-label="Close modal"
            >
                <X size={20} />
            </button>

            <div className="flex flex-col items-center gap-8 self-stretch p-4">
                <div className="flex flex-col items-start gap-8 self-stretch">
                    <div className="flex flex-col items-start gap-0 self-stretch">
                        <p className="self-stretch text-[#D9D9D9] leading-trim text-edge-cap text-3xl font-normal leading-normal"> 
                            Session {sessionNumber}
                        </p>
                        <p className="text-[rgba(255,255,255,0.50)] leading-trim text-edge-cap text-sm font-normal leading-normal self-stretch">
                            {new Date(sessionStart).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-4 self-stretch">
                        {selectedSessionEvents.map((event, index) => (
                            <SessionItem 
                                key={index} 
                                title={event.timeBoxName ?? 'Unknown'}
                                start={event.startDatetime} 
                                end={event.endDatetime ?? 'N/A'}
                            />
                        ))}
                    </div>
                </div>

                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="2" viewBox="0 0 480 2" fill="none" className="w-full">
                    <path d="M1 1L479 1.00002" stroke="#5E5E5E" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                <div className="flex flex-col items-start gap-8 self-stretch">
                    <div className="flex flex-col items-start gap-6 self-stretch">
                        <p className="text-[#D9D9D9] leading-trim text-edge-cap text-xl font-normal leading-normal self-stretch">Make an edit</p>
                        <div className="flex justify-between items-center self-stretch gap-4">
                            <Dropdown 
                                options={timeBoxes.map(box => ({ id: box.id, name: box.name }))}
                                value={selectedTimeBoxId}
                                onChange={(id) => setSelectedTimeBoxId(id)}
                                textSize="text-sm" 
                            />
                            <div className="flex items-center gap-2">
                                <TextItem content={fromTime} isInput={true} onChange={setFromTime} />
                                <p className="text-[#D9D9D9] text-center leading-trim text-edge-cap text-sm font-normal leading-normal">-</p>
                                <TextItem content={toTime} isInput={true} onChange={setToTime} />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center items-center self-stretch gap-4">
                        <PrimaryButton isActive={true} isClickable={isButtonActiveState} onClick={handleSave}>
                            Overwrite
                        </PrimaryButton>
                        <div className="h-4">
                            <p className={`text-gray-500 text-sm ${warningMessage ? '' : 'opacity-0 pointer-events-none'}`}>{warningMessage || ' '}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default EditModal;
