import React, { FunctionComponent } from "react";
import {StyledButton} from "../Style/baseStyle.css"

interface IProps {
    text: string;
    onClick: () => void;
    disabled?: boolean
}


export const Button: FunctionComponent< IProps> = (props: IProps) => { 

    return (
        <StyledButton
            disabled={props.disabled}
            onClick={() => props.onClick()}
        >
            {props.text}
        </StyledButton>
    )
}