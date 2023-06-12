import React, { FunctionComponent, ReactElement } from "react";
import { DeviceEntry, InnerOverlay, CenteredOverlay } from "../Style/overlayStyles.css";
import { StyledLine } from "../Style/baseStyle.css";


interface IProps {
    deviceList: Array<MediaDeviceInfo>;
    onDeviceSelect(devices: {[key: string] : any})
}

export const DeviceOverlay: FunctionComponent< IProps> = (props: IProps) => { 

        function generateList(type: string ): Array<ReactElement> {
            const out = [];
            for(const o of props.deviceList) {
                if(o.kind === type) {
                    
                    out.push(<DeviceEntry
                                title={o.label}
                                onClick={() => {
                                    const out = {};
                                    const deviceType = type === "videoinput" ? "video" : type === "audioinput" ? "audio" : "audioout";

                                    out[deviceType] = {deviceId: o.deviceId};
                                    this.onDeviceSelect(out);

                                }}> {`${o.label}`}</DeviceEntry>)
                }
            }
            return out;
        }
        console.log(props.deviceList);
        return(
            <CenteredOverlay 
                onClick={(ev: React.SyntheticEvent) => {
                    ev.stopPropagation();
                    ev.preventDefault();
                }}
                >
                <InnerOverlay> 
                    <StyledLine />
                    <div style={{marginBottom: '4px', fontWeight: 550}}> Audio In:</div> 
                        {
                            generateList("audioinput")
                        }
                    <StyledLine />
                    <div style={{marginBottom: '4px', fontWeight: 550}}> Audio Out:</div> 
                        {
                            generateList("audiooutput")
                        }
                    <StyledLine />
                    <div style={{marginBottom: '4px', fontWeight: 550}}> Video in:</div> 
                        {
                            generateList("videoinput")
                        }
                    <StyledLine />
                </InnerOverlay>

            </CenteredOverlay>
        );
    
}