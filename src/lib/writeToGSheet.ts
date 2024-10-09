import { invoke } from "@tauri-apps/api/tauri";
import { SessionEvent, Session } from "./types";
import { getTimeBoxes, getSessions, getSessionEvents } from "./dbInteraction";


export const handleSyncData = async (): Promise<string | undefined> => {
  try {
    const timeBoxes = await getTimeBoxes();
    const sessions = await getSessions();
    const sessionEvents = await getSessionEvents();

    const sheetId = await invoke('get_or_create_new_sheet', { title: "ClockBlocks Data" });
    console.log('Syncing sheet with ID:', sheetId);
    
    const timeBoxMap = timeBoxes.reduce((acc, box) => {
      acc[box.id] = box.name;
      return acc;
    }, {} as Record<string, string>);

    const detailsSessions = createDetailsSessions(sessions);
    const detailsSessionEvents = createDetailsSessionEvents(sessions, sessionEvents, timeBoxMap);
    const summaryBySession = createSummaryBySession(sessions, sessionEvents, timeBoxMap);
    const summaryByDate = createSummaryByDate(sessions, sessionEvents, timeBoxMap);

    // Write each table to the sheet
    await invoke('write_data_to_sheet', { 
      sheetId: sheetId, 
      sheetName: 'SummaryByDate', 
      data: summaryByDate 
    });

    await invoke('write_data_to_sheet', { 
      sheetId: sheetId, 
      sheetName: 'SummaryBySession', 
      data: summaryBySession 
    });

    await invoke('write_data_to_sheet', { 
      sheetId: sheetId, 
      sheetName: 'DetailsSessions', 
      data: detailsSessions 
    });

    await invoke('write_data_to_sheet', { 
      sheetId: sheetId, 
      sheetName: 'DetailsSessionEvents', 
      data: detailsSessionEvents 
    });


    console.log('Data synced successfully');
    return `https://docs.google.com/spreadsheets/d/${sheetId}`;
  } catch (error) {
    console.error('Error syncing data:', error);
    return undefined;
  }
};

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
}

function calculateDurationsByTimeBox(session: Session, sessionEvents: SessionEvent[], timeBoxMap: Record<string, string>): Record<string, string> {
  const durations: Record<string, number> = {};
  const sessionStart = session.startDatetime ? new Date(session.startDatetime).getTime() : 0;
  const sessionEnd = session.endDatetime ? new Date(session.endDatetime).getTime() : Date.now();

  sessionEvents
    .filter(event => event.sessionId === session.id)
    .forEach(event => {
      const eventStart = Math.max(new Date(event.startDatetime).getTime(), sessionStart);
      const eventEnd = event.endDatetime ? Math.min(new Date(event.endDatetime).getTime(), sessionEnd) : sessionEnd;
      const duration = eventEnd - eventStart;
      const timeBoxName = timeBoxMap[event.timeBoxId] || 'Unknown';
      durations[timeBoxName] = (durations[timeBoxName] || 0) + duration;
    });

  const totalDuration = sessionEnd - sessionStart;
  const breakDuration = totalDuration - Object.values(durations).reduce((sum, duration) => sum + duration, 0);
  durations['Break'] = breakDuration;

  return Object.fromEntries(
    Object.entries(durations).map(([name, duration]) => [name, formatDuration(Math.floor(duration / 1000))])
  );
}

function addDurations(duration1: string, duration2: string): string {
  if (!duration1 || !duration2) {
    return formatDuration(0);
  }

  const [h1, m1, s1] = duration1.split(':').map(Number);
  const [h2, m2, s2] = duration2.split(':').map(Number);
  
  let totalSeconds = (h1 * 3600 + m1 * 60 + s1) + (h2 * 3600 + m2 * 60 + s2);
  
  return formatDuration(totalSeconds);
}

function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

function formatDate(date: Date): string {
  const day = padZero(date.getDate());
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}


function createDetailsSessions(sessions: Session[]): string[][] {
  return [
    ['Session', 'Start', 'Stop', 'Duration'],
    ...sessions.map((session, index) => [
      (index + 1).toString(),
      session.startDatetime || '',
      session.endDatetime || '',
      formatDuration(session.duration)
    ])
  ];
}

function createDetailsSessionEvents(sessions: Session[], sessionEvents: SessionEvent[], timeBoxMap: Record<string, string>): string[][] {
  return [
    ['Event', 'Session', 'Start', 'End', 'Duration'],
    ...sessionEvents.map(event => {
      const startTime = new Date(event.startDatetime).getTime();
      const endTime = event.endDatetime ? new Date(event.endDatetime).getTime() : Date.now();
      const duration = formatDuration(Math.floor((endTime - startTime) / 1000));
      
      return [
        timeBoxMap[event.timeBoxId] || 'Unknown',
        (sessions.findIndex(s => s.id === event.sessionId) + 1).toString(),
        event.startDatetime,
        event.endDatetime || '',
        duration
      ];
    })
  ];
}

function createSummaryBySession(sessions: Session[], sessionEvents: SessionEvent[], timeBoxMap: Record<string, string>): string[][] {
  const timeBoxNames = [...new Set(Object.values(timeBoxMap))];
  return [
    ['Session', ...timeBoxNames, 'Break'],
    ...sessions.map((session, index) => {
      const durations = calculateDurationsByTimeBox(session, sessionEvents, timeBoxMap);
      return [
        (index + 1).toString(),
        ...timeBoxNames.map(name => durations[name] || '00:00:00'),
        durations['Break'] || '00:00:00'
      ];
    })
  ];
}

function createSummaryByDate(sessions: Session[], sessionEvents: SessionEvent[], timeBoxMap: Record<string, string>): string[][] {
  const timeBoxNames = [...new Set(Object.values(timeBoxMap))];
  const dateMap = new Map<string, Record<string, string>>();

  sessions.forEach(session => {
    if (session.startDatetime) {
      const date = formatDate(new Date(session.startDatetime));
      if (!dateMap.has(date)) {
        dateMap.set(date, Object.fromEntries(timeBoxNames.concat('Break').map(name => [name, '00:00:00'])));
      }
      const durations = calculateDurationsByTimeBox(session, sessionEvents, timeBoxMap);
      const dateDurations = dateMap.get(date)!;
      Object.entries(durations).forEach(([name, duration]) => {
        dateDurations[name] = addDurations(dateDurations[name], duration);
      });
    }
  });

  return [
    ['Date', ...timeBoxNames, 'Break'],
    ...Array.from(dateMap.entries()).map(([date, durations]) => [
      date,
      ...timeBoxNames.map(name => durations[name]),
      durations['Break']
    ])
  ];
}