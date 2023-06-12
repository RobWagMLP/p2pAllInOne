import React, { FunctionComponent } from 'react';
import ReactDOM from 'react-dom';
import { Navigate, Route, BrowserRouter as Router, Routes, useParams } from 'react-router-dom';
import  EntryComponent from './EntryComponent';
import { VideoChatComponent } from './VideoChatComponents';
import { Storage } from '../Helper/storage.ts';

interface IProps {

}

export const RouteComponent: FunctionComponent< IProps> = (props: IProps) => {

    return( 
        <Router>
            <Routes>
                <Route path="/session/:room_id/:person_id" element={<EntryComponent   />} />
                <Route path="/" element={<Navigate replace to="/session/xx"/> } /> 
            </Routes>
        </Router>
    )

}