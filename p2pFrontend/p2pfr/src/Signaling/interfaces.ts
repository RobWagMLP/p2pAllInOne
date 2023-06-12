import { ChatMessageTypeEnum, IncomingRequestType } from "./enums";

export interface SocketMessage {
    type: IncomingRequestType;
}

export interface RequestRoom extends SocketMessage {
    room_id: number;
}

export interface SingleOffer extends SocketMessage {
    offer: RTCSessionDescriptionInit;
    person_id_receive: number
}

export interface Offer extends SocketMessage {
    offer: RTCSessionDescriptionInit;
}

export interface Answer extends SocketMessage {
    answer: RTCSessionDescriptionInit;
    person_id: number;
}

export interface RecIceCandidate extends SocketMessage {
    candidate: RTCIceCandidate | RTCIceCandidateInit;
    person_id_receive: number
}

export interface RawMessage extends SocketMessage {
    message: string
}

export interface ClosePeer extends SocketMessage {
  
}

export interface ChatMessage {
    type: ChatMessageTypeEnum,
    blob?: Blob,
    name: string;
    message?: string;
}