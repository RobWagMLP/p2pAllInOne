import React, { PureComponent, ReactElement, SyntheticEvent } from "react";
import {  StyledTextField,  ChatWrapper, FileBox, MessageBox, Message, Name, Text, StyledLink } from "../Style/baseStyle.css";
import { ChatMessage } from "../Signaling/interfaces";
import { ChatMessageTypeEnum } from "../Signaling/enums";


interface IProps {
    messages: Array<ChatMessage>;
    onNewMessage: (message: string) => void;
}

const Colors = [
    '#5A5A5A',
    '#00008b',
    '#8b0000',
    '#9400d3',
    '#006400',
    '#d2691e'
]

export class ChatComponent extends PureComponent<IProps> {

    constructor(props: IProps) {
        super(props);

        this.scrollToBottom = this.scrollToBottom.bind(this);
    }

    componentDidMount(): void {
        const el = document.getElementById('chatbox_input_area') as HTMLTextAreaElement;
        el.addEventListener('keyup', (ev: KeyboardEvent) => {
            if(ev.key === 'Enter' && !ev.shiftKey) {
                this.props.onNewMessage(el.value);
                el.value = "";
            }
        })
    }

    getMessageBoxContent() : Array<ReactElement> {
        const out = [];
        out.push(
            <Message>
                    <Name
                        color={'black'}>
                        {"status: "}:
                    </Name>
                    <Text>
                        {"Chat initialized"}
                    </Text>
                </Message>
        )
        let i = 0;
        for(const o of this.props.messages) {
            out.push(
                <Message key={o.name + i}>
                    <Name
                        color={Colors[o.name.length%6]}>
                        {o.name}:
                    </Name>
                    <Text>
                        {o.type === ChatMessageTypeEnum.Message ? o.message
                                                                : <StyledLink download={o.message} href={URL.createObjectURL(o.blob)}>
                                                                    {o.message}
                                                                </StyledLink>}
                    </Text>
                </Message>
            )
            ++i;
        }
        return out;
    }

    scrollToBottom() {
        const el = document.getElementById('message_box_area');
        if(el) {
            el.scroll({top: el.scrollHeight, behavior: 'smooth'});
        }
    }

    render()  {
        return(
            <ChatWrapper>
                <MessageBox 
                    ref={() => this.scrollToBottom()}
                    id="message_box_area">
                    {this.getMessageBoxContent()}
                </MessageBox>
                <StyledTextField
                    placeholder="Type something"
                    id="chatbox_input_area"
                />
            </ChatWrapper>
        )
    }
}