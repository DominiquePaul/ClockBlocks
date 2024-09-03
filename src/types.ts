export interface TimeBox {
    id: number;
    name: string;
    seconds: number;
    isActive: boolean;
}

export interface SessionEvent {
    sessionId: number;
    startDatetime: string;
    endDatetime: string;
    boxId: number;
    boxTitle: string;
    seconds: number;
}