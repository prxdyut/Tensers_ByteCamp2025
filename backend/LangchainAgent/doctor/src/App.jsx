import { useState } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Route,
  Link,
  Routes,
  useLocation,
} from "react-router-dom";
import WebcamFeed from "./Interview/WebcamFeed";
import { Doctor } from "./Interview/Viva";

function App() {
  const [count, setCount] = useState(0);

  return <Doctor />;
}

export default App;
