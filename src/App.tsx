import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import 'App.css';
import "styles/theme.css";
import PlayingCardsLogo from 'CardsLogo';
import Home from 'pages/Home';
import InfoPage from 'pages/Info'; // Import your info page

function App() {
  return (
    <Router>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "10px 0 10px 0",
          background: "var(--background, #fff)",
          borderBottom: "1px solid var(--border, #ccc)",
          boxShadow: "0 2px 8px 0 rgba(0,0,0,0.03)",
        }}
      >
        <PlayingCardsLogo size={48} />
        <div>
          <span style={{ fontWeight: 600, fontSize: 18, color: "var(--foreground, #3b3b3b)" }}>
            Prototyping Card Game
          </span>
          <span style={{ display: "block", fontSize: 13, color: "var(--foreground, #888)" }}>
            by <strong>Boyd Buchanan</strong>
          </span>
        </div>
        <nav style={{ marginLeft: 24, display: "flex", gap: 8 }}>
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/info" className="nav-link">
            Info
          </Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/info" element={<InfoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
