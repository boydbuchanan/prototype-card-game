import React, { useCallback, useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import 'App.css';
import "styles/theme.css";
import PlayingCardsLogo from 'CardsLogo';
import Home, { defaultSetup } from 'pages/Home';
import InfoPage from 'pages/Info';

import { BoardState, CardData, CardTemplates, GameSetup, Scenario } from 'types';
import { toScenario } from 'components/Game/scenario';
import { TemplateProvider } from 'components/Game/TemplateContext';
import {
  asset, downloadJson, downloadUrl, fetchOptionalJson, parseCards, readCards, readJson,
} from 'components/Game/files';

/** A hidden file input paired with the button that opens it. */
const UploadButton: React.FC<{
  label: string;
  accept: string;
  onPick: (input: HTMLInputElement | null) => void;
}> = ({ label, accept, onPick }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="nav-button" onClick={() => ref.current?.click()}>{label}</button>
      <input type="file" accept={accept} ref={ref} hidden onChange={() => onPick(ref.current)} />
    </>
  );
};

function App() {
  const [game, setGame] = useState<GameSetup>(defaultSetup);
  const [cards, setCards] = useState<CardData[]>([]);
  const [templates, setTemplates] = useState<CardTemplates | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  // Live board, mirrored up from Home so it can be saved.
  const boardRef = useRef<{ state: BoardState; order: Record<string, string[]>; players: number }>(
    { state: {}, order: {}, players: 1 }
  );

  // Everything the project ships, loaded once. Templates and the scenario are
  // optional: without them cards render blank, or fall back to the first zone.
  useEffect(() => {
    fetch(asset('data/cards.csv'))
      .then((r) => r.text())
      .then((text) => parseCards(text, setCards))
      .catch((err) => console.error('Failed to load default cards.csv:', err));

    fetchOptionalJson<CardTemplates>('data/cardTemplates.json').then((j) => j && setTemplates(j));
    fetchOptionalJson<Scenario>('data/scenario.json').then((j) => j && setScenario(j));
  }, []);

  const handleBoardChange = useCallback((board: typeof boardRef.current) => {
    boardRef.current = board;
  }, []);

  // Write the current board out as a scenario — a save file, or a new starting setup.
  const handleSaveBoard = () => {
    const { state, order, players } = boardRef.current;
    downloadJson(toScenario(state, order, players, scenario?.name || 'Saved board'), 'scenario.json');
  };

  return (
    <div className="app-root">
      <Router basename={import.meta.env.BASE_URL}>
        <header className="app-header">
          <PlayingCardsLogo size={48} />
          <div>
            <span className="app-title">Prototyping Card Game</span>
            <span className="app-byline">by <strong>Boyd Buchanan</strong></span>
          </div>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/info" className="nav-link">Info</Link>
          </nav>
          <div className="app-actions">
            <UploadButton
              label="Upload Cards CSV"
              accept=".csv"
              onPick={(input) => readCards(input, setCards)}
            />
            <UploadButton
              label="Upload GameSetup JSON"
              accept=".json,application/json"
              onPick={(input) => readJson<GameSetup>(input, 'GameSetup', setGame)}
            />
            <UploadButton
              label="Upload Card Templates"
              accept=".json,application/json"
              onPick={(input) => readJson<CardTemplates>(input, 'CardTemplates', setTemplates)}
            />
            <UploadButton
              label="Upload Scenario"
              accept=".json,application/json"
              onPick={(input) => readJson<Scenario>(input, 'Scenario', setScenario)}
            />
            <button className="nav-button" onClick={handleSaveBoard}>Save Board</button>
            <button className="nav-button" onClick={() => downloadUrl(asset('data/cards.csv'), 'cards.csv')}>
              Download Cards CSV
            </button>
            {/* Filename is case-sensitive on GitHub Pages */}
            <button className="nav-button" onClick={() => downloadUrl(asset('data/gameSetup.json'), 'gameSetup.json')}>
              Download GameSetup JSON
            </button>
          </div>
        </header>

        <TemplateProvider templates={templates}>
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home cardData={cards} gameSetup={game} scenario={scenario} onBoardChange={handleBoardChange} />} />
              <Route path="/info" element={<InfoPage />} />
            </Routes>
          </main>
        </TemplateProvider>
      </Router>
    </div>
  );
}

export default App;
