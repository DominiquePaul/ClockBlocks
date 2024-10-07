import React from 'react';
import { X } from 'lucide-react'; // Import the X icon from Lucide
import PrimaryButton from './PrimaryButton';
import Dropdown from './DropDownButton';
import { useState, useEffect } from 'react';
import { getSessionEvents, getTimeBoxes, addSessionEvent, updateSessionEvent, deleteSessionEvent, startTransaction, commitTransaction, rollbackTransaction } from '../lib/dbInteraction';
import { SessionEvent, TimeBox } from '../lib/types';
import { useSession } from '../context/SessionContext';


interface TextItemProps {
  content: string;
  isInput: boolean;
  onChange?: (value: string) => void;
}

const TextItem: React.FC<TextItemProps> = ({ content, isInput, onChange }) => {
  return (
    <div className={`flex w-[50px] p-1 items-center justify-center rounded-md ${isInput ? 'bg-[#191919]' : ''}`}>
      {isInput ? (
        <input
          type="text"
          placeholder="HH:MM"
          value={content.slice(0, 5)} // Restrict length to 5 characters
          onChange={(e) => onChange && onChange(e.target.value.slice(0, 5))} // Restrict length to 5 characters
          className="w-full bg-transparent text-[#D9D9D9] font-inter text-sm font-normal leading-normal outline-none text-center"
        />
      ) : (
        <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal text-center">{content}</p>
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
      <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">{title}</p>
      <div className="flex items-center gap-2">
        <TextItem content={formatTimeFromISO(start)} isInput={false} />
        <p className="text-[#D9D9D9] text-center leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">-</p>
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
    console.log("Session ID", sessionId);
    const { setSessionEvents } = useSession();
    const [fromTime, setFromTime] = useState("");
    const [toTime, setToTime] = useState("");
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

    // New useEffect for setting fromTime and toTime
    useEffect(() => {
        console.log("Effect: fromTime and toTime");
        if (selectedSessionEvents.length > 0) {
            if (fromTime === "") {
                setFromTime(formatTimeFromISO(selectedSessionEvents[0].startDatetime));
            }
            if (toTime === "") {
                const lastEvent = selectedSessionEvents[selectedSessionEvents.length - 1];
                setToTime(lastEvent.endDatetime ? formatTimeFromISO(lastEvent.endDatetime) : "23:59");
            }
        }
    }, [selectedSessionEvents, fromTime, toTime]);

    useEffect(() => {
        const checkButtonActive = () => {
            console.log("Selected time box ID", selectedTimeBoxId);
            console.log("From time", fromTime);
            console.log("To time", toTime);
            console.log("Selected session events", selectedSessionEvents);
            console.log("Time boxes", timeBoxes);
            console.log("Session start", sessionStart);
            console.log("Session ID", sessionId);
            console.log("Session number", sessionNumber);


            if (selectedTimeBoxId === '') {
                console.log("Selected time box ID is empty");
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

            const eventStartTimes = selectedSessionEvents.map(event => new Date(event.startDatetime));
            const eventEndTimes = selectedSessionEvents.map(event => new Date(event.endDatetime || new Date().toISOString()));
            const firstEventStart = new Date(Math.min(...eventStartTimes.map(date => date.getTime())));
            const lastEventEnd = new Date(Math.max(...eventEndTimes.map(date => date.getTime())));

            const [startHours, startMinutes] = fromTime.split(':').map(Number);
            const [endHours, endMinutes] = toTime.split(':').map(Number);

            const enteredStartTime = new Date(firstEventStart);
            enteredStartTime.setHours(startHours, startMinutes, 0, 0);

            const enteredEndTime = new Date(firstEventStart);
            enteredEndTime.setHours(endHours, endMinutes, 0, 0);

            if (enteredEndTime <= enteredStartTime) {
                setWarningMessage('End time must be later than start time.');
                setIsButtonActiveState(false);
                return;
            }

            if (enteredEndTime < firstEventStart) {
                setWarningMessage('New end time cannot be earlier than the start of first event.');
                setIsButtonActiveState(false);
                return;
            }

            console.log("Last event end", lastEventEnd.toISOString());
            console.log("Entered start time", enteredStartTime.toISOString());

            if (enteredStartTime > lastEventEnd) {
                setWarningMessage('Start time cannot be later than the end of the last event.');
                setIsButtonActiveState(false);
                return;
            }

            setWarningMessage('');
            setIsButtonActiveState(true);
        };

        checkButtonActive();
    }, [selectedTimeBoxId, fromTime, toTime, selectedSessionEvents]);

    const handleSave = async () => {
        let eventIdsToDelete: string[] = [];
        let eventsToUpdate: SessionEvent[] = [];
        let newEvents: Omit<SessionEvent, 'id'>[] = [];

        const startDatetime = new Date(selectedSessionEvents[0].startDatetime);
        const endDatetime = new Date(selectedSessionEvents[0].startDatetime);

        const [startHours, startMinutes] = fromTime.split(':').map(Number);
        const [endHours, endMinutes] = toTime.split(':').map(Number);

        startDatetime.setHours(startHours, startMinutes, 0, 0);
        endDatetime.setHours(endHours, endMinutes, 0, 0);

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
        newEvents.push({ startDatetime: startDatetime.toISOString(), endDatetime: endDatetime.toISOString(), timeBoxId: selectedTimeBoxId, sessionId: selectedSessionEvents[0].sessionId, seconds: -1 });

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
        console.log("Events to update", eventsToUpdate);
        console.log("Events to delete", eventIdsToDelete);
        console.log("New events", newEvents);
        
        let transaction;
        try {
            // Start a transaction and get the transaction object
            transaction = await startTransaction();

            // Perform all database operations within the transaction
            for (const event of eventsToUpdate) {
                await updateSessionEvent(event, transaction);
            }

            for (const id of eventIdsToDelete) {
                await deleteSessionEvent(id, transaction);
            }

            for (const event of newEvents) {
                await addSessionEvent(event, transaction);
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
            setSelectedTimeBoxId(''); // Reset the dropdown

        } catch (error) {
            console.error("Error during save operation:", error);
            // If there's an error, roll back the transaction
            if (transaction) {
                await rollbackTransaction(transaction);
            }
            // Optionally, you can add some user feedback here
        } finally {
            // No need to release the connection, as it's managed by the pool
            // Just ensure the transaction is ended (either committed or rolled back)
        }
    };

    return (
        <div className="flex p-6 pb-1 flex-col items-center rounded-2xl bg-black backdrop-blur-[40px] w-[420px] border border-[#5E5E5E] border-opacity-30 max-h-[90vh] overflow-y-auto relative">
            {/* Close button */}
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
                        <p className="self-stretch text-[#D9D9D9] leading-trim text-edge-cap font-inter text-3xl font-normal leading-normal"> 
                            Session {sessionNumber}
                        </p>
                        <p className="text-[rgba(255,255,255,0.50)] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal self-stretch">
                            {new Date(sessionStart).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-4 self-stretch">
                        {selectedSessionEvents.map((event, index) => (
                            <SessionItem 
                                key={index} 
                                title={event.timeBoxName ?? 'Unknown'} // Use nullish coalescing operator
                                start={event.startDatetime} 
                                end={event.endDatetime ?? 'N/A'} // Use nullish coalescing operator
                            />
                        ))}
                    </div>
                </div>

                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="2" viewBox="0 0 480 2" fill="none" className="w-full">
                    <path d="M1 1L479 1.00002" stroke="#5E5E5E" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                <div className="flex flex-col items-start gap-8 self-stretch">
                    <div className="flex flex-col items-start gap-6 self-stretch">
                        <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-xl font-normal leading-normal self-stretch">Make an edit</p>
                        <div className="flex justify-between items-center self-stretch gap-4">
                            <Dropdown 
                                options={timeBoxes.map(box => ({ id: box.id, name: box.name }))} // Pass both id and name
                                value={selectedTimeBoxId}
                                onChange={(id) => setSelectedTimeBoxId(id)} // Update state with id on change
                                textSize="text-sm" 
                            />
                            <div className="flex items-center gap-2">
                                <TextItem content={fromTime} isInput={true} onChange={setFromTime} />
                                <p className="text-[#D9D9D9] text-center leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">-</p>
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