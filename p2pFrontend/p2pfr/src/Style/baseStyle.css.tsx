import styled from "styled-components";
import {theme} from './theme';

export const MainBox = styled.div`
    margin: ${theme.margins.global_margin};
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: ${theme.font.base_color}
`;

export const MiddleHeading = styled.div`
    color: white;
    font-weight:${theme.font.heading_font_weight};
    font-size: ${theme.font.heading_font_size};
    line-height: 44px;
    text-align: center;
    margin: ${theme.margins.space_margin};
    display: flex;
    align-items: center;
    font-family: Helvetica Neue,sans-serif;
`;

export const SmallHeading = styled.div`
    color: ${theme.font.heading_color};
    font-weight: 400;
    font-size: ${theme.font.heading_small_size};
    line-height: 32px;
    text-align: center;
    margin: ${theme.margins.space_margin};
    display: flex;
    align-items: center;
    font-family: ${theme.font.font_family};
`;

export const StyledInput = styled.input`
    border: 0;
    border-bottom: 2px solid ${theme.font.base_color};
    width: 50%;
    font-size: 18px;
    line-height: 20px;
    height: 20px;
    text-align: center;
    padding: 10px;
    background: transparent;
    color: ${theme.font.heading_color};
    :focus {
         outline: 0;
         color: ${theme.font.base_color};
    }
`;

export const StyledLink = styled.a`
    color: ${theme.font.heading_color};
    text-decoration: none;
    font-weight: 500;
`;

export const StyledTextField = styled.textarea`
    border: 0;
    border-bottom: 2px solid ${theme.font.heading_color};
    font-size: 14px;
    line-height: 16px;
    text-align: center;
    margin-top: 8px;
    padding: 10px;
    background-color: white;
    border-radius: 4px;
    height: 8%;
    text-align: left;
    color: ${theme.font.heading_color};
    :focus {
         outline: 0;
         color: ${theme.font.base_color};
    }
`;

export const ChatWrapper = styled.div`
    display: flex;
    flex-direction: column;
    margin: 16px;
    height: 50%;
    text-align: left;
`;

export const FileBox = styled.div`
    margin-top: 16px;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    height: 20%;
`;

export const MessageBox = styled.div`
    height: 70%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 2px solid ${theme.font.heading_color};
    border-radius: 4px;
    background-color: white;
    padding: 16px;
`;

export const Message = styled.div`
    display: flex;
    flex-direction: column;
    border-bottom: 2px solid ${theme.font.heading_color};
    margin-bottom: 4px;
    border-radius: 8px;
    padding: 8px;
    width: 95%;
    justify-content: flex-start;
    align-items: flex-start;
`;

export const Text = styled.div`
    overflow: visible;
    overflow-wrap: normal;
    font-size: 16px;
    font-family: ${theme.font.font_family}
`;

export const Name = styled.div<{color: string}>`
    text-overflow: ellipsis;
    overflow: hidden;
    color: ${props => props.color};
    white-space: nowrap;
    font-size: 10px;
    margin-bottom: 4px;
`;


export const KeyValueWrapper = styled.div`
    display: flex;
    margin: ${theme.margins.base_margin};
    width: 100%;
`;

export const KeyText = styled.div`
    font-weight: 300;
    font-size: 18px;
    color: ${theme.font.base_color};
    line-height: 20px;
    width: 50%;
    padding: 10px;
`;

export const HeaderBox = styled.div`
    height: 80px;
    width: 100%;
    display: flex;
    margin-bottom: 16px;
`;

export const ContentBox = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: calc(100vh - 300px);
    flex-wrap: nowrap;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 700px;
`;

export const SettingsBox = styled.div`
    height: 80px;
    width: 450px;
    border: 1px solid ${theme.font.heading_color};
    border-radius: 4px;
    display: flex;
    justify-Content: center;
    align-items: center;
`;

export const ErrBox = styled.div`
    font-size: 30px;
    font-color: ${theme.font.error_color}
    font-weight: 400;
`;

export const Footer = styled.div`
    height: 100px;
    margin-left: -32px;
    margin-bottom: -32px;
    margin-right: -32px;
    background-color: ${theme.font.base_color};
`;

export const Window = styled.div`
    width: 100%;

`;

export const IconWrapperSmall = styled.div`
    width: 16px;
    height: 16px;
    margin-left: 8px;
    svg {
        fill: ${theme.font.heading_color};
    }
`;

export const IconWrapperBig = styled.div`
    width: 32px;
    height: 32px;
    svg {
        fill: ${theme.font.heading_color};
    }
`;

export const HoverBox = styled.div`
    width: 32px;
    height: 32px;
    margin: 16px;
    :hover {
        cursor: pointer;
        svg {
            fill: ${theme.font.heading_color};
        }
    }
`;


export const VideoPreviewBox = styled.div`
    margin: 16px;
    display: inline-block;
    width: 100%;
`;

export const StyledLine = styled.div`
    width: 100%;
    height: 2px;
    background-color: white;
    margin-top: 8px;
    margin-bottom: 8px;
`;

export const StyledButton = styled.div<{disabled? : boolean}>`
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    width: 220px;
    height: 40px;
    background-color: ${props => props.disabled ? '#d3d3d3' : theme.font.heading_color};
    color: white;
    text-align: center;
    vertical-align: center;
    margin: 16px;
    border: 2px solid ${theme.font.base_color};
    font-weight: 500;
    border-radius: 4px;
    font-family: ${theme.font.font_family};
    :hover {
        background-color: ${props => props.disabled ? '#d3d3d3' : theme.font.base_color};
    }
`;

export const VideoMainGrid = styled.div`
    display: grid;
    grid-template-columns: [first]   80% [line-2] 20% [end];
    grid-template-rows   : [first-r] 5% [row-2] 85% [row-3] 10% [end-row];
    background-color: ${theme.font.base_color};
    height: 100vh;
    width: 100vw;
`;

export const VideoHeader = styled.div`
    grid-column-start: 1;
    grid-column-end: 4;
    border: 4px solid ${theme.font.heading_color};
    display: flex;
    justify-content: flex-start;
    align-items: center;
    background-color: white;
    border-radius: 4px;
`;

export const BottomArea = styled(VideoHeader)`
    grid-column-start: 1;
    grid-column-end: 4;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
    border: 2px solid ${theme.font.heading_color};
    background-color: ${theme.font.base_color};
`;

export const VideoArea = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    border-left: 2px solid ${theme.font.heading_color};
`;

export const RightArea = styled.div`
    display: flex;
    flex-direction: column;
    border-left: 2px solid ${theme.font.heading_color};
`;

export const OffsetVideoArea = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 8px;
    height: 50%;
    overflow-y: auto;
`;


export const RightMenuArea = styled.div`
    border-right: 2px solid ${theme.font.heading_color};
`;


export const VideoWrapper = styled.div<{width: string}>`
    width: ${props => props.width};
`;

export const InfoField = styled.div` 
    height: 32px;
    font-size: 24px;
    margin-top: -64px;
    margin-left: 16px;
    font-weight: 400;
    color: white;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    background-color: ${theme.font.base_color};
    border-radius: 4px;
    padding: 4px;
    max-width: 40%;
`;


export const SmallInfoField = styled(InfoField)` 
    height: 16px;
    font-size: 16px;
    margin-top: -32px;
    margin-left: 12px;
    color: white;
    background:transparent;
    border: none;
`;

export const VideoElement = styled.video<{width: string, maxheight: string}>`
    border-bottom: 1px solid white;
    border-radius: 4px;
    margin: 16px;
    padding: 4px;
    width: ${props => props.width};
    max-height: ${props => props.maxheight};
`;

export const SmallVideoWrapper = styled.div`
    display: flex;
    flex-direction: column;
`;

export const SmallVideo = styled.video`
    border: 1px solid white;
    border-radius: 4px;
    margin: 16px;
    max-width: 80%;
    min-width: 30%;
 `;

 export const MenuItemWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    border-radius: 8px;
    background-color: white;
    border: 4px solid ${theme.font.heading_color};
    width: 50%;
    height: 32px;
 `;