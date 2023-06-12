import React, { ReactElement, SyntheticEvent } from "react";
import { BottomArea, HoverBox, IconWrapperBig, IconWrapperSmall, InfoField, MenuItemWrapper, OffsetVideoArea, RightArea, RightMenuArea, SmallInfoField, SmallVideo, SmallVideoWrapper, VideoArea, VideoElement, VideoHeader, VideoMainGrid, VideoWrapper } from "../Style/baseStyle.css";
import { P2PHandler } from "../Signaling/p2pHandler";
import { Storage } from "../Helper/storage";
import { audioOn, audioOff, cameraOn, cameraOff, settings, shareScreen, uploadFile, chat, stop, stopShareScreen } from "../Helper/icons";
import { PEER_CHAT_MESSAGE } from "../Signaling/consts";
import { ChatComponent } from "./ChatComponent";
import { ChatMessage } from "../Signaling/interfaces";
import { ChatMessageTypeEnum } from "../Signaling/enums";

interface PeerData {
    name?: string;
    stream?: MediaStream;
    audio?: boolean;
    video?: boolean;
    screenShared?: boolean;
    nameTransferd?: boolean;
}

interface IProps {
    onDoneCallback: () => void;
}

interface IState {
    connections: Map<number, RTCPeerConnection>;
    streams:      Map<number, PeerData>;
    mediaEnabled: {cam: boolean, audio: boolean};
    deviceAndStream: {devices: Array<MediaDeviceInfo>;
                      stream:  MediaStream          };
    username: string;
    error?: string;
    screenshared: boolean;
    mainVideoArea: Array<number>;
    offsetVideoArea: Array<number>;
    canShareScreen?: boolean;
    screenShared?: boolean;
    senders: Map<number, Array<RTCRtpSender>>;
    screenMedia?: MediaStream;

    chatHistory: Array<ChatMessage>;

    showChat?: boolean;
}

export class VideoChatComponent extends React.Component<IProps, IState> {

    private p2pHandler  = Storage.getInstance().getP2pHandler();
    private maxMainView = 4;

    constructor(props: IProps) {
        super(props);
        const mediaEnabled      = Storage.getInstance().getCamAndAudio();
        const deviceAndStream   = Storage.getInstance().getMediaDeviceAndStream();
        const username          = Storage.getInstance().getUserName();

        this.state = {
            username: username,
            mediaEnabled: mediaEnabled,
            deviceAndStream: deviceAndStream,
            connections: this.p2pHandler.connections,
            streams: new Map<number, PeerData>(),
            screenshared: false,
            mainVideoArea: [],
            offsetVideoArea: [],
            canShareScreen: true,
            screenShared: false,
            senders: new Map<number, Array<RTCRtpSender>>(),
            chatHistory: [],
            showChat: true

        }

        this.setVideoSrcObject = this.setVideoSrcObject.bind(this);
    }

    componentDidMount(): void {
        
        this.p2pHandler.setErrorCallback((error: string) => {
            console.log(error);
            this.setState({
                error: error
            })
        })

        window.onbeforeunload =  () => {
            console.log("unloading");
            this.close();
            window.removeEventListener('unload', () => null);
            return true;
        };
        this.setSelfVideoTrack(this.state.deviceAndStream.stream);

        this.initP2P();
    }

    componentWillUnmount(): void {
       this.close();
    }

    initP2P() {
        this.p2pHandler.setNotify((message: string) => {
            console.log(message);
        })

        this.p2pHandler.setWebsocketConnectionIssueCallback((ev: Event) => {
            const error = "Websocket connection Issue"
            console.log(error);
            this.setState({
                error: error
            });
        })

        this.p2pHandler.setonOpenCallback(() => {
            this.startConnecting();
        });

        this.p2pHandler.setRoomReadycallback( (suc: boolean, message: string) => {
            if(suc) {
                console.log("room sucessfully initialized")
            } else {
                console.log(message);
                this.setState({
                    error: message
                });
            }
        });

        this.p2pHandler.setOnTrackcallback((person_id: number, ev: RTCTrackEvent) => {
            const streams = this.state.streams;
            const trackType = ev.track.kind;

            ev.track.onmute = (ev: Event) => {
                if(trackType === 'audio') {
                    this.onMutePeerAudio(false, person_id);
                } else {
                    this.onMutePeerVideo(false, person_id)
                }
            }
            
            ev.track.onunmute = (ev: Event) => {
                if(trackType === 'audio') {
                    this.onMutePeerAudio(true, person_id);
                } else {
                    this.onMutePeerVideo(true, person_id)
                }
            }
         
            let data: PeerData = streams.has(person_id) ? streams.get(person_id) : {};

            data.stream = ev.streams[0];

            if(trackType === 'audio') {
                data.audio = ev.track.enabled;
            } else if(trackType === 'video') {
                data.video = ev.track.enabled
            }

            const video: HTMLVideoElement = document.getElementById(`video_stream_${person_id}`) as HTMLVideoElement;

            if(video) {
                video.srcObject = data.stream;
            }

            const areas = this.handleVideoPush(person_id);

            streams.set(person_id, data);

            this.setState({
                streams: streams,
                mainVideoArea: areas.mainVideoArea,
                offsetVideoArea: areas.offsetVideoArea
            })
        })

        this.p2pHandler.setConnectionStatecallback((person_id: number, state: string) => {

            if(state === "closed") {

                const areas = this.handleVideoRemove(person_id);

                const streams = this.state.streams;

                const senders = this.state.senders;

                streams.delete(person_id);
                senders.delete(person_id);

                this.setState({
                    streams: streams,
                    mainVideoArea: areas.mainVideoArea,
                    offsetVideoArea: areas.offsetVideoArea,
                    senders: senders
                })
            }
        })

        this.p2pHandler.setOnNewConnectioncallback(async (con: RTCPeerConnection, person_id) =>  {

                const stream =  this.state.deviceAndStream.stream;

                const senders = this.setSingleStream(con, stream);

                if(this.state.screenShared) {
                    this.swapSingleVideoStream(this.state.screenMedia, senders);
                }
                
                const areas  = this.handleVideoPush(person_id)

                const senderMap = this.state.senders;

                senderMap.set(person_id, senders);

                const streams = this.state.streams;

                let data: PeerData = streams.has(person_id) ? streams.get(person_id) : {};

                data = this.sendState(person_id, data);

                streams.set(person_id, data);

                if(this.p2pHandler.isPolite(person_id)) {
                    this.p2pHandler.setupChatChannel(person_id);
                }

                this.setState({
                    mainVideoArea: areas.mainVideoArea,
                    offsetVideoArea: areas.offsetVideoArea,
                    senders: senderMap,
                    //streams: streams
                })
        });

        this.p2pHandler.setOnOrdercallback((order: string) => {
            if(order === "disconnect") {
                this.setState({
                    error: "Connections closed due to Server request -> Room closed"
                })
            } else{
                console.log(order);
            }
        });

        this.p2pHandler.setInfoReceivedCallback((rawJson: string, person_id: number) => {
            try{
                const data = JSON.parse(rawJson);

                const streamData = this.state.streams;
                let   entry = streamData.has(person_id) ? streamData.get(person_id) : {};

                let canShareScreen = this.state.canShareScreen;

                if(data['name']) {
                    entry.name = data['name'];
                }
                if(data['screenShared']) {
                    entry.screenShared = data['screenShared'];
                    canShareScreen = !data['screenShared'];
                }

                entry = this.sendState(person_id, entry, false);

                streamData.set(person_id, entry);

                this.setState({
                    streams: streamData,
                    canShareScreen: canShareScreen
                });

            } catch(err: any) {
                console.log("error on receiving message:" , err)
            }
        });

        this.p2pHandler.setChatmessageReceivedCallback((message: string, person_id: number) => {
            const hist = this.state.chatHistory;
            const usr = this.state.streams.get(person_id) ? this.state.streams.get(person_id).name : "Unkown";
            hist.push({name: usr, message: message,type: ChatMessageTypeEnum.Message});

            this.setState({
                chatHistory: hist
            })
            
        });

        this.p2pHandler.setFileReceivedCallback((name: string, file: Blob, person_id: number) => {
            const hist = this.state.chatHistory;
            const userName = this.state.streams.has(person_id) ? this.state.streams.get(person_id).name : "";

            hist.push({name: userName, message: name, type: ChatMessageTypeEnum.Blob, blob: file});

            this.setState({
                chatHistory: hist
            })

        })

        if(!this.p2pHandler.initialized) {
            this.p2pHandler.init(Storage.getInstance().getPersonID());
        } else {
            this.startConnecting();
        }
    }

    handleVideoPush(person_id: number): {mainVideoArea: Array<number>, offsetVideoArea: Array<number>} {
        const out = {mainVideoArea: this.state.mainVideoArea, offsetVideoArea: this.state.offsetVideoArea};

        if(out.mainVideoArea.indexOf(person_id) > -1 || out.offsetVideoArea.indexOf(person_id) > -1) {
            return out;
        }
        if(out.mainVideoArea.length >= this.maxMainView) {
            out.offsetVideoArea.push(person_id)
        } else {
            out.mainVideoArea.push(person_id)
        }

        return out;
    }

    sendState(person_id: number, entry: PeerData, sendOnpolite: boolean = true): PeerData {
        if(entry.nameTransferd !== true && this.p2pHandler.isPolite(person_id) === sendOnpolite) {
            const sendObj = JSON.stringify({name: this.state.username, screenShared: this.state.screenShared});
            this.p2pHandler.sendInfo(sendObj, person_id);

            entry.nameTransferd = true;
        }
        return entry;
    }

    handleVideoRemove(person_id: number): {mainVideoArea: Array<number>, offsetVideoArea: Array<number>} {
        const out = {mainVideoArea: this.state.mainVideoArea, offsetVideoArea: this.state.offsetVideoArea};

        const idxMain = out.mainVideoArea.indexOf(person_id);
        const idxOff  = out.offsetVideoArea.indexOf(person_id);

        if(idxMain > -1) {
            out.mainVideoArea.splice(idxMain, 1);
            if(out.offsetVideoArea.length > 0) {
                out.mainVideoArea.push(out.offsetVideoArea.pop());
            }
        } else if(idxOff > -1) {
            out.offsetVideoArea.splice(idxOff, 1);
        } else {
            return out;
        }

        return out;
    }

    onMutePeerAudio(audio: boolean, person_id: number) {
        const streams = this.state.streams;
        if(!streams || !streams.has(person_id)) {
            return;
        }

        const data = streams.get(person_id);
        data.audio = audio;
        streams.set(person_id, data);
        
        this.setState({
            streams: streams
        })
    }

    onMutePeerVideo(video: boolean, person_id: number) {
        const streams = this.state.streams;
        if(!streams || !streams.has(person_id)) {
            return;
        }
        const data = streams.get(person_id);
        data.video = video;
        streams.set(person_id, data);

        this.setState({
            streams: streams
        })
    }

    close() {
        this.p2pHandler.disconnectFromPeers();

        for(const o of this.state.connections) {
            o[1].close();
        }
    }

    onMuteAudio(audio: boolean) {
        const stream = this.state.deviceAndStream.stream;

        stream.getAudioTracks()[0].enabled = audio;

        for(const o of this.state.connections) {
            const transc = o[1].getTransceivers();
            const mode = audio ? 'sendrecv' : 'recvonly';
            transc[0].direction = mode;
        }

        this.setState({
            mediaEnabled: {cam: this.state.mediaEnabled.cam, audio: audio}
        });
        
    }

    onMuteVideo(video: boolean) {
        const stream = this.state.deviceAndStream.stream;
        
        stream.getVideoTracks()[0].enabled = video;

        this.setState({
            mediaEnabled: {cam: video, audio: this.state.mediaEnabled.audio}
        });
        
    }

    startConnecting() {
        try {
            this.p2pHandler.initRoom(Storage.getInstance().getRoomID());          
        } catch(error: any) {
            console.log(error);
            this.setState({
                error: error.cause
            })
        }
    }

    setVideoSrcObject(person_id: number) {
        if(this.state.streams.has(person_id)) {
            const stream = this.state.streams.get(person_id).stream;
            const element: HTMLVideoElement = document.getElementById(`video_stream_${person_id}`) as HTMLVideoElement;
            if(stream && element) {
                element.srcObject = stream;
            }
        }
    }

    setupVideoArea() : Array<ReactElement> {
        const out = [];
        const participans = this.state.mainVideoArea.length;

        const width = participans > 1 ? '35vw' : '100%';
        const maxHeight = participans > 2 ? '40vh': '80vh';

        for(const person_id of this.state.mainVideoArea) {

            const stream = this.state.streams.get(person_id);
          
            out.push(
                <VideoWrapper
                    width={participans > 1 ? '35vw' : '90%'}>
                    <VideoElement
                        ref={() => {this.setVideoSrcObject(person_id)}}
                        id={`video_stream_${person_id}`}
                        key={`video_stream_${person_id}`}
                        autoPlay={true}
                        width={width}
                        maxheight={maxHeight}
                        />
                    <InfoField>
                        {stream != null ? stream.name : person_id}
                        {" "}
                        {stream != null && stream.audio === false ? <IconWrapperBig> { audioOff() }</IconWrapperBig>: null}
                    </InfoField>
                </VideoWrapper>
            );
        }
        return out;
    }

    setupOffsetArea() : Array<ReactElement> { 
        const out = [];

        out.push(
            <SmallVideoWrapper>
                <SmallVideo 
                    id="video_stream_self"
                    key="video_stream_self"
                    autoPlay={true}
                />
                 <SmallInfoField>
                    {this.state.username}
                    {" "}
                    {this.state.mediaEnabled.audio === false ? <IconWrapperSmall> { audioOff() } </IconWrapperSmall>: null}
                </SmallInfoField>
            </SmallVideoWrapper>
        );

        for(const person_id of this.state.offsetVideoArea) {
            const stream = this.state.streams.get(person_id);

            out.push(
                <SmallVideoWrapper>
                    <SmallVideo 
                        ref={() => {this.setVideoSrcObject(person_id)}}
                        id={`video_stream_${person_id}`}
                        key={`video_stream_${person_id}`}
                        autoPlay={true}
                    />
                     <SmallInfoField>
                        {stream != null ? stream.name : person_id}
                        {" "}
                        {stream != null && stream.audio === false ? <IconWrapperSmall> { audioOff() } </IconWrapperSmall> : null}
                </SmallInfoField>
                </SmallVideoWrapper>
            );
        }
        return out;
    }

    removeTracks(connection: RTCPeerConnection, person_id: number) {
        if(!this.state.senders.has(person_id)) {
            return;
        }
        
        for(const sender of this.state.senders.get(person_id) ) {
            connection.removeTrack(sender);
        }
    }

    async swapVideoStreams(stream: MediaStream) {
        const senderMap = this.state.senders;

        for(const senderList of senderMap) {
            await this.swapSingleVideoStream(stream, senderList[1]);
        }
    }

    async swapSingleVideoStream(stream: MediaStream, senderList: Array<RTCRtpSender>) {

        for(const sender of senderList) {
            if(sender.track.kind === 'video') {
                try{
                    await sender.replaceTrack(stream.getVideoTracks()[0]);

                } catch(err: any) {
                    console.log(err);

                    this.setState({
                        error: err.cause
                    });
                }
            }
        }
    }

    setSingleStream(connection: RTCPeerConnection, stream: MediaStream): Array<RTCRtpSender> {
        const out = [];

        for(const track of stream.getTracks()) {
            out.push(connection.addTrack(track, stream));
        }

        return out;
    }

    async selectFile() {
        const fileSelect = document.createElement('input');
        fileSelect.type = 'file';
        fileSelect.onchange = (ev: Event) => {
            const files = Array.from(fileSelect.files);
            const file :File = files[0];

            this.p2pHandler.sendFile(file);
            const hist = this.state.chatHistory;
            hist.push({name: this.state.username, message: file.name, blob: file, type: ChatMessageTypeEnum.Blob});
            this.setState({
                chatHistory: hist
            })
        }
        fileSelect.click();
    }

    setSelfVideoTrack(stream: MediaStream) {
        const videoSelf     = document.getElementById('video_stream_self') as HTMLVideoElement;

        const videoStream = new MediaStream();

        videoStream.addTrack(stream.getVideoTracks()[0]);

        videoSelf.srcObject = videoStream;

    }

    async handleScreenShare(share: boolean) {

        if(share) {
            let captureStream;

            try {
                captureStream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true});

                this.setSelfVideoTrack(captureStream);

                this.swapVideoStreams(captureStream);

                this.setState( {
                    screenShared: true,
                    screenMedia: captureStream
                })

            } catch(err: any) {
                console.log(err);
                this.setState({
                    error: err.cause
                })
            }
        } else {
            this.setSelfVideoTrack(this.state.deviceAndStream.stream);

            this.swapVideoStreams(this.state.deviceAndStream.stream);

            this.setState( {
                screenShared: false,
            })
        }
    }
        

    render(){
        return(
            <VideoMainGrid>
                <VideoHeader>
                    <img style={{maxWidth: '200px', marginLeft: '16px'}} src="/ecocare_health_logo.png" />
                </VideoHeader>
                
                <VideoArea>
                    {this.setupVideoArea()}
                </VideoArea>
                <RightArea>
                    <OffsetVideoArea>
                        {this.setupOffsetArea()}   
                    </OffsetVideoArea>
                    {this.state.showChat ? 
                        <ChatComponent 
                            messages={this.state.chatHistory}
                            onNewMessage={(message: string) => {
                                const hist = this.state.chatHistory;

                                hist.push({name: this.state.username, message: message, type: ChatMessageTypeEnum.Message});

                                this.p2pHandler.broadCastChatMessage(message);

                                this.setState({
                                    chatHistory: hist
                                })
                            }}
                        /> : null }
                </RightArea>
                <BottomArea>
                    <MenuItemWrapper>
                        <HoverBox onClick={() => {
                            this.onMuteAudio(!this.state.mediaEnabled.audio)
                            }}>
                            {this.state.mediaEnabled.audio ? audioOn() : audioOff()}
                            </HoverBox>
                        <HoverBox onClick={() => {
                            this.onMuteVideo(!this.state.mediaEnabled.cam)
                            }}>
                            {this.state.mediaEnabled.cam ? cameraOn() : cameraOff()}
                        </HoverBox>
                        <HoverBox onClick={(event: SyntheticEvent) => {
                            event.stopPropagation();
                            }}>
                            {settings()}
                        </HoverBox>
                        <HoverBox onClick={(event: SyntheticEvent) => {
                                event.stopPropagation();
                                if(this.state.canShareScreen) {
                                    this.handleScreenShare(!this.state.screenShared)
                                }
                            }}>
                            {this.state.screenShared || !this.state.canShareScreen ? stopShareScreen() : shareScreen()}
                        </HoverBox>
                        <HoverBox onClick={(event: SyntheticEvent) => {
                            event.stopPropagation();
                            this.selectFile();
                            }}>
                            {uploadFile()}
                        </HoverBox>
                        <HoverBox onClick={(event: SyntheticEvent) => {
                            event.stopPropagation();
                            this.setState({
                                showChat: !this.state.showChat
                            })
                            }}>
                            {chat()}
                        </HoverBox>
                        <HoverBox onClick={(event: SyntheticEvent) => {
                            event.stopPropagation();
                            this.close();
                            this.props.onDoneCallback();
                            }}>
                            {stop()}
                        </HoverBox>
                    </MenuItemWrapper>
                </BottomArea>
            </VideoMainGrid>

        )
    }
}
