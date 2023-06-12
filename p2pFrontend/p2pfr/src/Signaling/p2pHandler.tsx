
import { getIceServer } from "../Helper/util";
import { Signaling } from "./signaling";
import { Storage }from "../Helper/storage"
import { IncomingRequestType } from "./enums";
import { END_IF_FILE_MSG, MAX_BYTE_PER_TRANSFER, PEER_CHAT_MESSAGE, PEER_INFO_SHARE } from "./consts";
import { arrayBuffer } from "stream/consumers";
import { FileBuilder } from "../Helper/filebuilder";

const MaxRetryCount = 3;

export class P2PHandler {

    private iceServer: [];

    private signaling: Signaling;
    
    private roomReadyCallback:                (suc: boolean, message?: string) => void;

    private errorCallback:                    (error: string ) => void;

    private connectiontStateCallback:         (person_id: number, state: any) => void;

    private websocketConnectionIssueCallback: (ev: Event) => void;

    private onTrackReceived:                  (person_id: number, ev: RTCTrackEvent) => void;

    private notify:                           (message: string) => void;

    private onOpenCallback:                   () => void;

    private onOrder:                          (order: string) => void;

    private onNewConnection:                  (con: RTCPeerConnection, person_id: number) => void;

    private onInfoReceived:                   (rawjson: string, person_id: number) => void;
 
    private onFileReceived:                   (name: string, file: Blob, person_id: number) => void;

    private onChatMessageReceived:            (message: string, person_id:number) => void;

    private statusHistory: Array<string>;

    private errorHistory:  Array<string>;

    private canReqestRoom: boolean;

    private canEnterRoom:  boolean;
    
    private negoiatation:  Map<number, {polite: boolean, sendingOffer: boolean, retryCount: number}>;

    private dataChannels:  Map<number, Map<string, RTCDataChannel>>;

    private filebuilder:   FileBuilder;

    public  connections:   Map<number, RTCPeerConnection>;

    public  initialized:   boolean;

    public constructor() {
        this.connections   = new Map<number, RTCPeerConnection>();
        this.negoiatation  = new Map<number, {polite: boolean, sendingOffer: boolean, retryCount: number}>;
        this.initialized   = false;
        this.canEnterRoom  = false;
        this.canReqestRoom = false;
        this.errorHistory  = [];
        this.statusHistory = [];
        this.dataChannels  = new Map<number, Map<string, RTCDataChannel>>();
        this.filebuilder   = new FileBuilder();
    }

    setErrorCallback(method:  (error: string ) => void) {
        this.errorCallback = method;
    }

    setNotify(method: (message: string) => void) {
        this.notify = method; 
    }

    setonOpenCallback(method:  ( ) => void) {
        this.canReqestRoom = true;
        this.onOpenCallback = method;
    }

    setWebsocketConnectionIssueCallback(method:  (ev: Event ) => void) {
        this.canReqestRoom = false;
        this.websocketConnectionIssueCallback = method;
    }

    setConnectionStatecallback(method:  (person_id: number, state: string) => void) {
        this.connectiontStateCallback = method;
    }

    setOnTrackcallback(method: (person_id: number, ev: RTCTrackEvent) => void) {
        this.onTrackReceived = method;
    }

    setOnOrdercallback(method: (order: string) => void) {
        this.onOrder = method;
    }

    setOnNewConnectioncallback(method: (con: RTCPeerConnection, person_id: number) => void) {
        this.onNewConnection = method;
    }

    setRoomReadycallback(method:  (suc: boolean, message?: string) => void) {
        this.roomReadyCallback = method;
    }

    setInfoReceivedCallback(method: (rawjson: string, person_id: number) => void) {
        this.onInfoReceived = method;
    }

    setFileReceivedCallback(method: (name: string, file: Blob, person_id: number) => void) {
        this.onFileReceived = method;
    }

    setChatmessageReceivedCallback(method: (message: string, person_id: number) => void) {
        this.onChatMessageReceived = method;
    }

    isPolite(person_id: number): boolean {
        return this.negoiatation.get(person_id).polite;
    }
    
    private async setupConnection(person_id: number) : Promise<RTCPeerConnection>{
        this.iceServer.splice(3, 2);
        const connection = await new RTCPeerConnection({iceServers: this.iceServer});

        this.negoiatation.set(person_id, {polite: person_id > Storage.getInstance().getPersonID(), sendingOffer: false, retryCount: 0});

        connection.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
            if(ev.candidate) {
                this.signaling.sendIceCandidate({type: IncomingRequestType.SendIceCandidateToPeers, candidate: ev.candidate, person_id_receive: person_id});
            }
        }

        connection.onnegotiationneeded = (ev: Event) => {
            try{
                this.negoiatation.get(person_id).sendingOffer = true;
                this.sendSingleOffer(person_id);
            } catch(err: any) {
                this.errorCallback(err.cause);
            } finally {
                this.negoiatation.get(person_id).sendingOffer = false;
            }
        };

        connection.oniceconnectionstatechange = (ev: Event) => {
            console.log("connectionstate change", connection.iceConnectionState);

            if(!this.negoiatation.has(person_id)) {
                console.log("Person already cleaned up");
                return;
            }

            if(connection.iceConnectionState === 'disconnected') {
                if(this.negoiatation.get(person_id).retryCount >= MaxRetryCount) {
                    console.log("retry counter exceeded, closing");
                    this.closePeer(person_id);
                }
                else {
                    const userNeg = this.negoiatation.get(person_id);
                    
                    userNeg.retryCount +=1;
                    this.negoiatation.set(person_id, userNeg);

                    connection.restartIce();
                }
            }
            else if(connection.iceConnectionState === 'connected') {
                const userNeg = this.negoiatation.get(person_id);
                    
                userNeg.retryCount = 0;
                this.negoiatation.set(person_id, userNeg);
            }
            else if(connection.iceConnectionState === 'failed' || connection.iceConnectionState === 'closed') {
                this.closePeer(person_id);
            }
        }

        //ts-ignore
        connection.ontrack = (ev: RTCTrackEvent) => {
            this.onTrackReceived(person_id, ev);
        }

        connection.ondatachannel = (ev: RTCDataChannelEvent) => {
            const channel = ev.channel;
            const type    = channel.label;
            console.log("receiving info");
            switch(type) {
                case PEER_INFO_SHARE: {
                        channel.onmessage = (ev: MessageEvent) => {
                            this.onInfoReceived(ev.data, person_id);
                        }
                    }
                    break;
                case PEER_CHAT_MESSAGE: {
                        channel.onmessage = (ev: MessageEvent) => {
                            this.onChatMessageReceived(ev.data, person_id);
                        }
                    }
                    break;
                default: {
                        const split = type.split("::");
                        if(split[0] !== 'file_share') {
                            return;
                        }
                        channel.binaryType = 'arraybuffer';
                        const filename = split[1];
                        channel.onmessage = (ev: MessageEvent) => {
                            if(this.filebuilder.assembleFile(filename, ev.data)) {
                                const file = this.filebuilder.buildFile(filename);
                                this.onFileReceived(filename, file, person_id)
                            }
                        }
                        
                    }
            };
            const chnlmap = this.dataChannels.has(person_id) ? this.dataChannels.get(person_id) : new Map<string, RTCDataChannel>();
            chnlmap.set(type, channel);

            this.dataChannels.set(person_id, chnlmap);
        }

        return Promise.resolve(connection);
    }

    closePeer(person_id) {
        this.connections.delete(person_id);
        this.negoiatation.delete(person_id);
        this.connectiontStateCallback(person_id, 'closed');
    }

    ignoreRequest(person_id: number): boolean {
        return  this.negoiatation.has(person_id) && 
               !this.negoiatation.get(person_id).polite && 
              ( this.negoiatation.get(person_id).sendingOffer || this.connections.get(person_id).signalingState !== 'stable');
    }

    disconnect() {
        if(this.signaling) {
            this.signaling.disconnect();
        }
    }

    async init(person_id: number) {
        if(!this.initialized) {
            this.iceServer = await getIceServer();

            this.signaling = new Signaling();

            this.signaling.addOnOpenListener(this.onOpenCallback);

            this.signaling.addOnErrorListener((error: string) => {
                console.log(error);
                this.errorHistory.push(error);

                switch(error) {
                    case "no_access_to_room": {
                        this.canEnterRoom = false;
                        this.roomReadyCallback(false, error);
                    } break;
                    default: this.errorCallback(error);
                }
            });

            this.signaling.addOnCloseListener((reason: string) => {
                console.log(`Socket connection closed due to ${reason}`);
                this.canEnterRoom = false;
                this.canReqestRoom = false;
            })

            this.signaling.addonWebSocketErrorListener((ev: Event) => {
                this.websocketConnectionIssueCallback(ev);
            })

            this.signaling.addStatusListener((status: string) => {
                console.log(status);
                switch(status) {
                    default: this.notify(status);
                }
                this.statusHistory.push(status);
            });

            this.signaling.addOnRoomInfoListener( async (userList: number[]) =>  {
                this.roomReadyCallback(true);

                this.canEnterRoom = true;

                for(const o of userList) {
                    const connection = await this.setupConnection(o);
                    this.connections.set(o, connection);

                    this.onNewConnection(connection, o);
                }
            });
            
            this.signaling.addAnswerListener(async (answer: RTCSessionDescriptionInit, person_id: number) => {
                this.notify(`anser received from person ${person_id}`);

                if(this.connections.has(person_id)) {
                    const connection = this.connections.get(person_id);
                    const remoteDescr = new RTCSessionDescription(answer);

                    await connection.setRemoteDescription(remoteDescr);

                    this.connections.set(person_id, connection);
                }
            });

            this.signaling.addIceCandidateListener(async (candidate: RTCIceCandidateInit | RTCIceCandidate, person_id: number) => {
                this.notify(`ice candidate received from person ${person_id}`);
                
                if(this.connections.has(person_id)) {
                    const connection = this.connections.get(person_id);
                    try {                  
                        //@ts-ignore
                        candidate.usernameFragment = null;
                        await connection.addIceCandidate(candidate);
                        this.connections.set(person_id, connection);
                    } catch(err: any) {
                        console.log(`error setting ice candidate for ${person_id}, error: ${err}`);
                    }
                }
            });

            this.signaling.addOfferListener(async (offer: RTCSessionDescriptionInit, person_id: number) => {
                this.notify(`offer received from person ${person_id}`);
                
                if(this.ignoreRequest(person_id)) {
                    console.log("Ignoring request", this.negoiatation);
                    return;
                }
                
                let knownConnection = this.connections.has(person_id);

                const connection = knownConnection ? this.connections.get(person_id) : await this.setupConnection(person_id);

                const sessionDesc = new RTCSessionDescription(offer);

                await connection.setRemoteDescription(sessionDesc);

                //const answer = await connection.createAnswer();
                await connection.setLocalDescription();


                this.connections.set(person_id, connection);
                
                if(!knownConnection) {
                    this.onNewConnection(connection, person_id);
                }
                this.signaling.sendAnswer({type: IncomingRequestType.AcceptOfferFromPeers, answer: connection.localDescription, person_id: person_id});

            });

            this.signaling.addOrderListener((order: string) => {
                switch (order) {
                    case "disconnect": {
                        this.onOrder(order);
                        for(const o of this.connections) {
                            o[1].close();
                        }
                        this.connections.clear();
                    }
                    break;
                    default: this.onOrder(order);
                }
            });

            this.signaling.addPeerClosedListener((person_id_close: number) => {
                this.closePeer(person_id_close);
            })

            this.signaling.connect(person_id);

            this.initialized = true;
        }
    }

    initRoom(room_id: number) {
        if(!this.canReqestRoom) {
            throw new Error('Socket not ready');
        }
        this.signaling.sendRoomRequest({type: IncomingRequestType.RequestRoom, room_id: room_id});
    }

    async sendSingleOffer(person_id: number) {
        if(!this.canEnterRoom) {
            throw new Error('Room not ready');
        }

        if(this.connections.size > 0 ){
            const connection = this.connections.get(person_id);
            //const offer = await connection.createOffer();         

            await connection.setLocalDescription();

            this.signaling.sendSingleOffer({type: IncomingRequestType.SendOfferToSinglePeer, offer: connection.localDescription, person_id_receive: person_id});
        }
    }

    async sendOffer() {
        if(!this.canEnterRoom) {
            throw new Error('Room not ready');
        }
        const descriptionSet = false;
        let   offer: RTCSessionDescriptionInit;

        if(this.connections.size > 0 ){
            for(const o of this.connections) {
                await o[1].setLocalDescription();
                if(!descriptionSet) {
                    offer = o[1].localDescription
                }
            }
            this.signaling.sendOffer({type: IncomingRequestType.SendOfferToPeers, offer: offer});
        }
    }

    sendMessage(message: string) {
        this.signaling.sendMessage({type: IncomingRequestType.Message, message: message});
    }

    getOrCreateDataChannel(type: string, person_id: number): RTCDataChannel {
        let dataChannel: RTCDataChannel;
        if(this.dataChannels.has(person_id) && this.dataChannels.get(person_id).has(type) ) {
            dataChannel = this.dataChannels.get(person_id).get(type);
        } else {
            dataChannel = this.connections.get(person_id).createDataChannel(type);
            
        }
        return dataChannel;
    }

    sendInfo(info: string, person_id: number) {
        console.log("sending info");

        let dataChannel: RTCDataChannel = this.getOrCreateDataChannel(PEER_INFO_SHARE,person_id);
        
        if(dataChannel.readyState === 'open') {
            dataChannel.send(info);
            return;
        }

        const chnlmap = this.dataChannels.has(person_id) ? this.dataChannels.get(person_id) : new Map<string, RTCDataChannel>();

        dataChannel.onopen = (ev: Event) => {
            dataChannel.send(info);
        }

        dataChannel.onmessage = (ev: MessageEvent) => {
            this.onInfoReceived(ev.data, person_id);
        }

        chnlmap.set(PEER_INFO_SHARE, dataChannel);
        this.dataChannels.set(person_id, chnlmap);
    }

    setupChatChannel(person_id: number) {
        let dataChannel: RTCDataChannel = this.getOrCreateDataChannel(PEER_CHAT_MESSAGE, person_id);

        const chnlmap = this.dataChannels.has(person_id) ? this.dataChannels.get(person_id) : new Map<string, RTCDataChannel>();

        dataChannel.onopen = (ev: Event) => {
            console.log("Chat channel ready")
        }

        dataChannel.onmessage = (ev: MessageEvent) => {
            this.onChatMessageReceived(ev.data, person_id);
        }

        chnlmap.set(PEER_CHAT_MESSAGE, dataChannel);
        this.dataChannels.set(person_id, chnlmap);
    }

    broadCastChatMessage(message: string) {
        for(const channels of this.dataChannels) {
            if(channels[1].has(PEER_CHAT_MESSAGE) && channels[1].get(PEER_CHAT_MESSAGE).readyState === 'open') {
                channels[1].get(PEER_CHAT_MESSAGE).send(message);
            }
        }
    }

    closeDataChannel(person_id: number, type: string) {
        if(this.dataChannels.has(person_id)) {
            const channel = this.dataChannels.get(person_id).get(type);
            if(channel) {
                channel.close();
                this.dataChannels.get(person_id).delete(type);
            }
        }
    }

    disconnectFromPeers() {
        this.signaling.sendPeerClose({type: IncomingRequestType.PeerClosed});
    }

    async sendFile(file: File) {
        const arrBuffer = await file.arrayBuffer();
        for(const o of this.connections) {
            let dataChannel: RTCDataChannel = this.getOrCreateDataChannel(`file_share::${file.name}`, o[0]);
            dataChannel.binaryType = 'arraybuffer';

            dataChannel.onopen = (ev: Event) => {
                for(let i = 0; i < arrBuffer.byteLength; i += MAX_BYTE_PER_TRANSFER) {
                    dataChannel.send(arrBuffer.slice(i, i + MAX_BYTE_PER_TRANSFER));
                }
                dataChannel.send(END_IF_FILE_MSG);
            }   
        }
    }
}