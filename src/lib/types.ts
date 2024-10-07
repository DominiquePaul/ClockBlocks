export interface TimeBox {
    id: string;
    name: string;
    seconds: number;
    isActive: boolean;
    isHidden: boolean;
    isDeleted: boolean;
    colour: string;
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

export interface AuthToken {
    access_token: string;
    refresh_token: string;
    expiry: number;
  }