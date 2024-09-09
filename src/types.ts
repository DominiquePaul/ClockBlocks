export interface TimeBox {
    id: string;
    name: string;
    isDeleted: boolean;
    seconds: number;
    isActive: boolean;
}

export interface SessionEvent {
    id: string;
    timeBoxId: string;
    startDatetime: string;
    endDatetime: string;
    seconds: number;
} 