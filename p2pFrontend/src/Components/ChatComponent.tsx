import React, { PureComponent, ReactElement } from "react";
import {  StyledTextField,  ChatWrapper, MessageBox, Message, Name, Text, StyledLink } from "../Style/baseStyle.css";
import { ChatMessage } from "../Signaling/interfaces";
import { ChatMessageTypeEnum } from "../Signaling/enums";
import { Colors } from "../Signaling/consts";


interface IProps {
    messages: Array<ChatMessage>;
    onNewMessage: (message: string) => void;
    disabled?: boolean;
}

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
                        {this.props.disabled ? "...initializing" : "Chat initialized"}
                    </Text>
                </Message>
        )
        let i = 0;
        for(const o of this.props.messages) {
            if(o.name == null) {
                o.name = "Name_not_received";
            }
            out.push(
                <Message key={o.name + i}>
                    <Name
                        key={`name_${o.name + i}`}
                        color={Colors[o.name.length%6]}>
                        {o.name}:
                    </Name>
                    <Text
                        key={`text_${o.name + i}`}>
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
                    disabled={this.props.disabled === true}
                    placeholder="Type something"
                    id="chatbox_input_area"
                />
            </ChatWrapper>
        )
    }
}