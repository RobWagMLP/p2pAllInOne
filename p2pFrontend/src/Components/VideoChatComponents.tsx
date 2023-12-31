import React, { ReactElement, SyntheticEvent } from "react";
import { BottomArea, Circle, HoverBox, IconWrapperBig, IconWrapperSmall, InfoField, LoadingSpinner, MenuItemWrapper, NoOnHereBox, NoOnHereText, OffsetVideoArea, RightArea, RightMenuArea, SmallInfoField, SmallVideo, SmallVideoWrapper, VideoArea, VideoElement, VideoHeader, VideoMainGrid, VideoWrapper } from "../Style/baseStyle.css";
import { P2PHandler } from "../Signaling/p2pHandler";
import { Storage } from "../Helper/storage";
import { audioOn, audioOff, cameraOn, cameraOff, settings, shareScreen, uploadFile, chat, stop, stopShareScreen } from "../Helper/icons";
import { Colors, PEER_CHAT_MESSAGE } from "../Signaling/consts";
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
    mainDisplay?: boolean;
}

interface IProps {
    onDoneCallback: () => void;
}

interface IState {
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
    canChat?:  boolean;
}

export class VideoChatComponent extends React.Component<IProps, IState> {

    private p2pHandler  = Storage.getInstance().getP2pHandler();
    private maxMainView = 4;
    private remuteVideo: boolean = false;

    constructor(props: IProps) {
        super(props);
        const mediaEnabled      = Storage.getInstance().getCamAndAudio();
        const deviceAndStream   = Storage.getInstance().getMediaDeviceAndStream();
        const username          = Storage.getInstance().getUserName();

        if(deviceAndStream.stream.getVideoTracks() == null || deviceAndStream.stream.getVideoTracks().length === 0) {
            deviceAndStream.stream = this.createDummyTrack(deviceAndStream.stream);
        }

        this.state = {
            username: username,
            mediaEnabled: mediaEnabled,
            deviceAndStream: deviceAndStream,
            streams: new Map<number, PeerData>(),
            screenshared: false,
            mainVideoArea: [],
            offsetVideoArea: [],
            canShareScreen: true,
            screenShared: false,
            senders: new Map<number, Array<RTCRtpSender>>(),
            chatHistory: [],
            showChat: true,
            canChat: false

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

    createDummyTrack(stream: MediaStream) {
        let canvas = document.createElement("canvas");
    
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
    
        let dummystream = canvas.captureStream();
        
        let dummyVideo  = dummystream.getVideoTracks()[0];

        dummyVideo.enabled = false;
        
        const newStream = new MediaStream([stream.getAudioTracks()[0], dummyVideo]);

        return newStream;
    }

    toggleVideoToMain(person_id: number) {
        const streams = this.state.streams;
        const stream = streams.get(person_id);

        let mainView = this.state.mainVideoArea;
        let offView = this.state.offsetVideoArea;

        if(stream) {
            if(stream.mainDisplay === false) {
                             
                offView = offView.concat(mainView);
                const idx = offView.indexOf(person_id);
                mainView = [].concat(offView.splice(idx, 1));
                
                stream.mainDisplay = true;
                this.maxMainView = 1;

                for(const o of offView) {
                    const streamToOff = streams.get(o);
                    if(streamToOff) {
                        streamToOff.mainDisplay = false;
                        streams.set(o, streamToOff);
                    }
                }
            } else {
                if(offView.length === 0) {
                    return;
                }
                for(let i = offView.length - 1; i >= 0; i--) {
                    mainView = mainView.concat(offView.splice(i, 1));

                    if(mainView.length > 3) {
                        break;
                    }

                    stream.mainDisplay = false;
                    this.maxMainView = 4;
                }
            }
        }
        streams.set(person_id, stream);

        this.setState({
            streams: streams,
            mainVideoArea: mainView,
            offsetVideoArea: offView
        })
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

        this.p2pHandler.setIceCandidateGatheredcallback((person_id: number) => {
            
            console.log("Ice candidates gathered");    
        })

        this.p2pHandler.setOnTrackcallback((person_id: number, ev: RTCTrackEvent) => {
            const streams = this.state.streams;
         
            let data: PeerData = streams.has(person_id) ? streams.get(person_id) : {};

            data.stream = ev.streams[0];

           /* const video: HTMLVideoElement = document.getElementById(`video_stream_${person_id}`) as HTMLVideoElement;

            if(video) {
                video.srcObject = data.stream;
            }*/

            const areas = this.handleVideoPush(person_id);
            
            data.mainDisplay = false;

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

        this.p2pHandler.setonNameReceivedcallback((name: string, person_id: number) => {
            const streams = this.state.streams;

            let data: PeerData = streams.has(person_id) ? streams.get(person_id) : {};
            
            data.name = name;

            streams.set(person_id, data);
            this.setState({
                streams: streams
            })
        })

        this.p2pHandler.setOnInfoChannelOpencallback((person_id: number) => {
            console.log("info channel open");
            const streams = this.state.streams;
            let data: PeerData = streams.has(person_id) ? streams.get(person_id) : {};

            data = this.sendState(person_id, data);

            streams.set(person_id, data);
            this.setState({
                streams: streams
            })
        })

        this.p2pHandler.setOnChatOpencallback((person_id: number) => {
            this.setState({
                canChat: true
            })
        })

        this.p2pHandler.setOnNewConnectioncallback(async (con: RTCPeerConnection, person_id, fromOffer: boolean) =>  {

                const stream =  this.state.deviceAndStream.stream;

                if(!fromOffer) {
                    this.p2pHandler.setupChatChannel(person_id);
                    this.p2pHandler.setupInfoChannel(person_id);
                }

                const senders = this.setSingleStream(con, stream);

                if(this.state.screenShared) {
                    this.swapSingleVideoStream(this.state.screenMedia, senders);
                }
                
                const areas  = this.handleVideoPush(person_id)

                const senderMap = this.state.senders;

                senderMap.set(person_id, senders);

                const streams = this.state.streams;

                let data: PeerData = streams.has(person_id) ? streams.get(person_id) : {};

                streams.set(person_id, data);

                this.setState({
                    streams: streams
                })
               
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
                console.log("ive got a message");
                const streamData = this.state.streams;
                let   entry = streamData.has(person_id) ? streamData.get(person_id) : {};

                let canShareScreen = this.state.canShareScreen;
                if(data['name']) {
                    entry.name = data['name'];

                }
                if(data['screenShared'] != null) {
                    entry.screenShared = data['screenShared'];
                    canShareScreen = !data['screenShared'];
                }
                if(data['audio'] !=  null) {
                    entry = this.onMutePeerAudio(data['audio'], entry);
                }
                if(data['video'] !=  null) {
                    entry = this.onMutePeerVideo(data['video'] || data['screenShared'] === true, entry);
                }

                //entry = this.sendState(person_id, entry);

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
            out.offsetVideoArea.push(person_id);
        } else {
            out.mainVideoArea.push(person_id);
        }

        return out;
    }

    sendState(person_id: number, entry: PeerData): PeerData {
        if(!entry.nameTransferd ) {
            const sendObj = JSON.stringify({name: this.state.username, 
                                            screenShared: this.state.screenShared, 
                                            video: this.state.deviceAndStream.stream.getVideoTracks()[0].enabled,
                                            audio: this.state.deviceAndStream.stream.getAudioTracks()[0].enabled});
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

    onMutePeerAudio(audio: boolean, data: PeerData): PeerData {

        data.audio = audio;

        if(data.stream != null && data.stream.getAudioTracks().length > 0) {
            data.stream.getAudioTracks()[0].enabled = audio;
        }
        return data;
    }

    onMutePeerVideo(video: boolean, data: PeerData): PeerData {

        data.video = video;

        if(data.stream != null && data.stream.getVideoTracks().length > 0) {
            data.stream.getVideoTracks()[0].enabled = video;
        }
        return data;
    }

    close() {
        this.p2pHandler.disconnectFromPeers();

        this.state.streams.clear();
        this.p2pHandler.reset();
    }

    broadCastDeviceInfo(fields: {}) {
        for(const a of this.p2pHandler.connections) {
            this.p2pHandler.sendInfo(JSON.stringify(fields), a[0]);
        }
    }

    onMuteAudio(audio: boolean) {
        const stream = this.state.deviceAndStream.stream;

        stream.getAudioTracks()[0].enabled = audio;

       /* for(const o of this.p2pHandler.connections) {
            const transc = o[1].getTransceivers();
            const mode = audio ? 'sendrecv' : 'recvonly';
            transc[0].direction = mode;
        }*/
        this.broadCastDeviceInfo({audio: audio, video: stream.getVideoTracks()[0].enabled, screenShared: this.state.screenShared});

        this.setState({
            mediaEnabled: {cam: this.state.mediaEnabled.cam, audio: audio}
        });
        
    }

    onMuteVideo(video: boolean) {
        const stream = this.state.deviceAndStream.stream;

        stream.getVideoTracks()[0].enabled = video;

        /*for(const o of this.p2pHandler.connections) {
           this.sendSingleTranceiver(o[1], video);
        }*/

        this.broadCastDeviceInfo({audio: stream.getAudioTracks()[0].enabled, video: video, screenShared: this.state.screenShared});

        this.setState({
            mediaEnabled: {cam: video, audio: this.state.mediaEnabled.audio}
        });
        
    }

    sendSingleTranceiver(connection: RTCPeerConnection, video: boolean) {
        const transc = connection.getTransceivers();
        const mode = video ? 'sendrecv' : 'recvonly';
        transc[1].direction = mode;
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
        //console.log(this.state.streams.get(person_id));
        if(this.state.streams.has(person_id)) {
            const stream = this.state.streams.get(person_id).stream;
            const element: HTMLVideoElement = document.getElementById(`video_stream_${person_id}`) as HTMLVideoElement;
            if(stream && element) {
                element.srcObject = stream;
            }
        }
    }

    getInitials(name: string): string {
        let displayName: string = "";
        const words = name.split(" ");

        for(let i = 0; i < words.length; i++){
            displayName += words[i].charAt(0).toUpperCase();
            if(displayName.length > 2) {
                break;
            }
        }
        if(displayName.length < 2 && name.length > 1) {
            displayName += name.charAt(1);
        }

        return displayName;
    }

    setupVideoArea() : Array<ReactElement> {
        const out = [];
        const participans = this.state.mainVideoArea.length;

        const width  = participans > 1 ? 'calc(50% - 32px)' : 'calc(100% - 32px)';
        const height = participans > 2 ? 'calc(50% - 32px)' : 'calc(100% - 32px)';

        if(this.state.mainVideoArea.length === 0){
            out.push(
                <NoOnHereBox>
                    <LoadingSpinner maxHeight={"50%"}/>
                    <NoOnHereText>
                        ... Seems there's noone here yet.
                    </NoOnHereText>
                </NoOnHereBox>
            )
        }

        for(const person_id of this.state.mainVideoArea) {
            try{
                const stream = this.state.streams.get(person_id);

                const name  = stream.name != null ? stream.name : "Anon";
                const display = stream.video === false ? "flex" : "none";
                const color = Colors[name.length%6];
                let displayName = "";

                if(stream.video === false) {
                    displayName = this.getInitials(name);
                }

                out.push(
                    <VideoWrapper
                        onDoubleClick={(event: SyntheticEvent) => {
                            event.stopPropagation();
                            event.preventDefault();
                            this.toggleVideoToMain(person_id);
                        }}
                        height={height}
                        width={width}
                        display={display}
                        color={color}
                        text={displayName}>
                        {stream.stream == null ? 
                        <LoadingSpinner />     :
                        <React.Fragment>
                            <VideoElement
                                ref={() => {this.setVideoSrcObject(person_id)}}
                                id={`video_stream_${person_id}`}
                                key={`video_stream_${person_id}`}
                                autoPlay={true}
                            />                      
                            <InfoField>
                                {stream != null && stream.audio === false ? <IconWrapperBig> { audioOff() }</IconWrapperBig>: null}
                            </InfoField>
                        </React.Fragment> }
                    </VideoWrapper>
                );
            } catch(err: any) {
                console.log(err);
            }
        }
        return out;
    }

    setupOffsetArea() : Array<ReactElement> { 
        const out = [];

        out.push(
            <SmallVideoWrapper
                display={this.state.deviceAndStream.stream.getVideoTracks()[0].enabled ? 'none' : 'flex'}
                color={Colors[this.state.username.length%6]}
                text={this.getInitials(this.state.username)}
                key="video_stream_self_wrapper"
            >
                <SmallVideo 
                    id="video_stream_self"
                    key="video_stream_self"
                    autoPlay={true}
                />
                 <SmallInfoField>
                    {this.state.mediaEnabled.audio === false ? <IconWrapperSmall> { audioOff() } </IconWrapperSmall>: null}
                </SmallInfoField>
            </SmallVideoWrapper>
        );

        for(const person_id of this.state.offsetVideoArea) {
            try{
                const stream = this.state.streams.get(person_id);
                const name  = stream.name != null ? stream.name : "Anon";
                const display = stream.video === false ? "flex" : "none";
                const color = Colors[name.length%6];
                let displayName = "";

                if(stream.video === false) {
                    displayName = this.getInitials(name);
                }
                out.push(
                    <SmallVideoWrapper
                        display={display}
                        color={color}
                        text={displayName}
                        key={`video_stream_${person_id}_wrapper`}
                        onDoubleClick={(event: SyntheticEvent) => {
                            event.stopPropagation();
                            event.preventDefault();
                            this.toggleVideoToMain(person_id);
                        }}>
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
            } catch(err: any) {
                console.log(err);
            }
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

                if(!this.state.deviceAndStream.stream.getVideoTracks()[0].enabled) {
                    this.broadCastDeviceInfo({video: true, audio: this.state.deviceAndStream.stream.getAudioTracks()[0].enabled});
                    this.remuteVideo = true;
                }

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

            if(this.remuteVideo) {
                this.broadCastDeviceInfo({video: false, audio: this.state.deviceAndStream.stream.getAudioTracks()[0].enabled});
                this.remuteVideo = false;
            }
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
                            disabled={!this.state.canChat}
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
                            if(!this.state.screenShared) {
                                this.onMuteVideo(!this.state.mediaEnabled.cam)
                            }
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
