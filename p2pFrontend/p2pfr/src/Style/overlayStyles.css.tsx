import styled from "styled-components";
import {theme} from './theme';

export const CenteredOverlay = styled.div`
    position: absolute;
    z-index: 10000;
    width:  500px;
    background-color: ${theme.font.base_color};;
    left: 0;
    right: 0;
    border: 2px solid ${theme.font.heading_color};
    border-radius: 4px;
    color: white;
    margin: auto;
`;

export const InnerOverlay = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 32px;
`;

export const DeviceEntry = styled.div` 
    width: 95%;
    font-weight: 400;
    color: white;
    margin-bottom: 8px;
    margin-left: 32px;
    display: flex;
    text-align: left;
    display: block;
    justify-content: flex-start;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    :hover {
        font-weight: 500;
        cursor: pointer;
        background-color: white;
        color: ${theme.font.heading_color};
        border-radius: 4px;
    }
`;