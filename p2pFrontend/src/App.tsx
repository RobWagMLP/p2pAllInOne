import React from 'react';
import './App.css';
import { RouteComponent } from './Components/RouteComponent';
import {Window, Footer} from './Style/baseStyle.css'

function App() {
  console.log(process.env);
  return (
    <div className="App">
      <Window>
        <RouteComponent />
      </Window>
    </div>
  );
}

export default App;
