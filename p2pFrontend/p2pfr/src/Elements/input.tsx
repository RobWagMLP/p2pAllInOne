import React from "react";
import { KeyText, KeyValueWrapper, StyledInput } from "../Style/baseStyle.css";

interface IProps {
    label: string;
    placeholder: string;
    text?: string;
    id: string;
    callback: (value: {id: string; text: string}) => void
}

interface IState {
    text: string;
}

export class Input extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            text: props.text == null ? "" : props.text
        }   
    }

    render(){
        return(
            <KeyValueWrapper>
                <KeyText>
                    {this.props.label}
                </KeyText>
                <StyledInput 
                    id={this.props.id}
                    value={this.state.text}
                    onChange={(event: any) => {
                            const text = event.target.value;
                            this.setState({
                                text: text
                            }, () =>  this.props.callback({id: this.props.id, text: text}));
                        }
                    }
                />
            </KeyValueWrapper>
        )
    }
}