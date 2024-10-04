import React from 'react';
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
          value={content}
          onChange={(e) => onChange && onChange(e.target.value)}
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

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const SessionItem: React.FC<SessionItemProps> = ({ title, start, end }) => {
  return (
    <div className="flex justify-between items-center self-stretch">
      <p className="text-[#D9D9D9] leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">{title}</p>
      <div className="flex items-center gap-2">
        <TextItem content={formatTime(start)} isInput={false} />
        <p className="text-[#D9D9D9] text-center leading-trim text-edge-cap font-inter text-sm font-normal leading-normal">-</p>
        <TextItem content={formatTime(end)} isInput={false} />
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
    const { setSessionEvents } = useSession();
    const [fromTime, setFromTime] = useState("");
    const [toTime, setToTime] = useState("");
    const [selectedTimeBoxId, setSelectedTimeBoxId] = useState<string>(''); // State for selected time box
    const [selectedSessionEvents, setSelectedSessionEvents] = useState<SessionEvent[]>([]);
    
    const [timeBoxes, setTimeBoxes] = useState<TimeBox[]>([]); // State for timeboxes

    useEffect(() => {
        const loadSessionEvents = async () => {
            const events = await getSessionEvents();
            const filteredEvents = events.filter(event => event.sessionId === sessionId);
            setSelectedSessionEvents(filteredEvents);

            const lastEvent = filteredEvents[filteredEvents.length - 1];
            if (fromTime === ""){
                setFromTime(formatTime(lastEvent.startDatetime));
            }
            if (toTime === ""){
                setToTime(lastEvent.endDatetime ? formatTime(lastEvent.endDatetime) : "23:59");
            }
        };

        const loadTimeBoxes = async () => {
            const boxes = await getTimeBoxes();
            setTimeBoxes(boxes);
        };

        loadSessionEvents();
        loadTimeBoxes();

    }, [sessionId]);



    // Merge timeboxes with session events
    const mergedEvents = selectedSessionEvents.map(event => {
        const timeBox = timeBoxes.find(box => box.id === event.timeBoxId);
        return {
            ...event,
            timeBoxName: timeBox ? timeBox.name : 'Unknown' // Add timeBoxName to the event
        };
    });

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

        console.log("Events", selectedSessionEvents);
        console.log("New timebox", selectedTimeBoxId);
        console.log("New start", startDatetime.toISOString());
        console.log("New end", endDatetime.toISOString());

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
                console.log("Event: ", event);
                console.log("New start: ", startDatetime.toISOString());
                console.log("New end: ", endDatetime.toISOString());
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
                console.log(`Event ID: ${event.id}, Duration: ${seconds} seconds`);
                eventsToUpdate[index] = { ...event, seconds: seconds }; // Update the original array with the duration
            }
        });

        // Add new duration to newEvents
        newEvents.forEach((event, index) => {
            const seconds = calculateDuration(event.startDatetime, event.endDatetime || new Date().toISOString());
            if (seconds !== null) {
                console.log(`New TimeBoxID: ${event.timeBoxId}, Duration: ${seconds} seconds`);
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
            setSessionEvents(updatedEvents);

            // Update the selected session events being shown and reset the dropdown, from time, and to time
            const filteredEvents = updatedEvents.filter(event => event.sessionId === sessionId);
            setSelectedSessionEvents(filteredEvents);
            setSelectedTimeBoxId(''); // Reset the dropdown

            // Close the modal
            // onClose();

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
        <div className="flex p-6 flex-col items-center rounded-2xl bg-black backdrop-blur-[40px] w-[420px] border border-[#5E5E5E] border-opacity-30 max-h-[90vh] overflow-y-auto">
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
                        {mergedEvents.map((event, index) => (
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
                    <div className="flex justify-center items-center gap-8 self-stretch">
                        <PrimaryButton isActive={true} onClick={handleSave}>
                            Overwrite
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default EditModal;