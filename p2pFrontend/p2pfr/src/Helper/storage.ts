import { P2PHandler } from "../Signaling/p2pHandler";

export class Storage {
    
    private static instance: Storage;
    
    private username: string;
    private person_id: number;
    private room_id:  number;
    private media: {
        cam: boolean,
        audio: boolean
    };
    private settings: {};

    private mediaDeviceAndStream: {
        devices: Array<MediaDeviceInfo>;
        stream:  MediaStream
    }

    private p2phandler: P2PHandler;

    private constructor() {

    }

    static getInstance() : Storage {
        if(this.instance == null) {
            this.instance = new Storage();
        }
        return this.instance;
    }

    setRoomID(room_id: number)  {
        this.room_id = room_id;
    }

    getRoomID(): number {
        return this.room_id;
    }

    setPersonID(person_id: number) {
        this.person_id = person_id;
    }

    getPersonID(): number {
        return this.person_id;
    }

    setUsername(name: string) {
        this.username = name;
    }

    getUserName(): string {
        return this.username;
    }

    setCamAndAudio(vals: {cam: boolean, audio: boolean}) {
        this.media = vals;
    }

    getCamAndAudio(): {cam: boolean, audio: boolean} {
        return this.media;
    }

    setSettings(settings: {}) {
        this.settings = settings;
    }

    getSettings() : {} {
        return this.settings;
    }

    setMediaDeviceAndStream(data: { devices: any; stream:  MediaStream}) {
        this.mediaDeviceAndStream = data;
    }

    getMediaDeviceAndStream(): { devices: any; stream:  MediaStream} {
        return this.mediaDeviceAndStream;
    }

    setP2pHandler(p2phandler: P2PHandler) {
        this.p2phandler = p2phandler;
    }

    getP2pHandler(): P2PHandler {
        return this.p2phandler;
    }
}