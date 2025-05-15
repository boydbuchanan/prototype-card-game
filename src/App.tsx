import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import 'App.css';
import "styles/theme.css";
import PlayingCardsLogo from 'CardsLogo';
import Home, { defaultSetup } from 'pages/Home';
import InfoPage from 'pages/Info';

import Papa from 'papaparse';
import { CardData, GameSetup } from 'types';

function App() {
  const [game, setGameState] = useState<GameSetup>(defaultSetup);
  const [cards, setCards] = useState<CardData[]>([]);
  
  // Reference for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gameSetupInputRef = useRef<HTMLInputElement>(null);

  // Dynamically set basename for GitHub Pages, empty for local dev
  const basename = process.env.PUBLIC_URL?.replace(/https?:\/\/[^/]+/, "") || "";

  // Load cards.csv by default on mount
  useEffect(() => {
    const csvUrl = `${process.env.PUBLIC_URL}/data/cards.csv`;
    fetch(csvUrl)
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data as CardData[];
            setCards(parsedData);
          },
          error: (error: any) => {
            console.error("Error parsing default CSV:", error);
          }
        });
      })
      .catch(err => {
        console.error("Failed to load default cards.csv:", err);
      });
  }, []);

  // Trigger file input click
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleGameSetupUploadClick = () => gameSetupInputRef.current?.click();

  // Handle file upload for cards.csv
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data as CardData[];
          setCards(parsedData);
        },
        error: (error: any) => {
          console.error("Error parsing CSV:", error);
        }
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle file upload for gamesetup.json
  const handleGameSetupFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setGameState(json);
      } catch (err) {
        console.error("Invalid GameSetup JSON:", err);
      }
    };
    reader.readAsText(file);
    if (gameSetupInputRef.current) gameSetupInputRef.current.value = "";
  };

  // Download helpers
  const handleDownloadCards = () => {
    const url = `${process.env.PUBLIC_URL}/data/cards.csv`;
    const link = document.createElement("a");
    link.href = url;
    link.download = "cards.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadGameSetup = () => {
    const url = `${process.env.PUBLIC_URL}/data/gamesetup.json`;
    const link = document.createElement("a");
    link.href = url;
    link.download = "gamesetup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Router basename={basename}>
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
        <div style={{ marginLeft: 24, display: "flex", gap: 8 }}>
          <button className="nav-button" onClick={handleUploadClick}>
            Upload Cards CSV
          </button>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button className="nav-button" onClick={handleGameSetupUploadClick}>
            Upload GameSetup JSON
          </button>
          <input
            type="file"
            accept=".json,application/json"
            ref={gameSetupInputRef}
            style={{ display: "none" }}
            onChange={handleGameSetupFileChange}
          />
          <button className="nav-button" onClick={handleDownloadCards}>
            Download Cards CSV
          </button>
          <button className="nav-button" onClick={handleDownloadGameSetup}>
            Download GameSetup JSON
          </button>
        </div>
      </header>
      
      <Routes>
        <Route path="/" element={<Home cardData={cards} gameSetup={game} />} />
        <Route path="/info" element={<InfoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
