export interface TimeBox {
    id: string;
    name: string;
    seconds: number;
    isActive: boolean;
    isHidden: boolean; // Add this line if it doesn't exist
    isDeleted: boolean;
}

export interface SessionEvent {
    id: string;
    timeBoxId: string;
    sessionId: string;
    startDatetime: string;
    endDatetime: string | null;
    seconds: number;
} 

export interface Session {
    id: string;
    startDatetime: string | null;
    endDatetime: string | null;
    sessionEvents: SessionEvent[];
    duration: number;
}