import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'rugby_obs_scoreboard_state_v1';

const defaultState = {
  homeTeam: 'Home Team',
  awayTeam: 'Away Team',
  homeScore: 0,
  awayScore: 0,
  period: '1st Half',
  timeSeconds: 0,
  running: false,
  updatedAt: Date.now(),
};

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

function writeStoredState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${pad(mins)}:${pad(secs)}`;
}

function App() {
  const overlayMode = useMemo(() => new URLSearchParams(window.location.search).get('overlay') === '1', []);
  const [state, setState] = useState(readStoredState);
  const [manualTime, setManualTime] = useState(formatTime(readStoredState().timeSeconds));

  useEffect(() => {
    writeStoredState(state);
  }, [state]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const incoming = JSON.parse(event.newValue);
          setState((prev) => ({ ...prev, ...incoming }));
        } catch {
          // ignore invalid storage events
        }
      }
    };

    window.addEventListener('storage', onStorage);

    const syncInterval = window.setInterval(() => {
      const latest = readStoredState();
      setState((prev) => {
        if (latest.updatedAt !== prev.updatedAt) {
          return { ...prev, ...latest };
        }
        return prev;
      });
    }, 500);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    setManualTime(formatTime(state.timeSeconds));
  }, [state.timeSeconds]);

  useEffect(() => {
    if (!state.running) return;

    const timer = window.setInterval(() => {
      setState((prev) => ({
        ...prev,
        timeSeconds: prev.timeSeconds + 1,
        updatedAt: Date.now(),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.running]);

  const updateState = (patch) => {
    setState((prev) => ({
      ...prev,
      ...patch,
      updatedAt: Date.now(),
    }));
  };

  const applyManualTime = () => {
    const match = manualTime.trim().match(/^(\d{1,3}):(\d{2})$/);
    if (!match) return;
    const mins = Number(match[1]);
    const secs = Number(match[2]);
    if (secs > 59) return;
    updateState({ timeSeconds: mins * 60 + secs });
  };

  const resetAll = () => {
    updateState({
      homeScore: 0,
      awayScore: 0,
      period: '1st Half',
      timeSeconds: 0,
      running: false,
    });
  };

  if (overlayMode) {
    return (
      <div className="overlay-root">
        <div className="scoreboard">
          <div className="team-block team-left">
            <div className="team-label">HOME</div>
            <div className="team-name">{state.homeTeam}</div>
          </div>

          <div className="centre-block">
            <div className="score-line">{state.homeScore} - {state.awayScore}</div>
            <div className="match-meta">
              <span className="period-pill">{state.period}</span>
              <span className="clock-text">{formatTime(state.timeSeconds)}</span>
            </div>
          </div>

          <div className="team-block team-right">
            <div className="team-label">AWAY</div>
            <div className="team-name">{state.awayTeam}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="panel">
        <h1>Rugby League OBS Scoreboard</h1>
        <p className="subtext">Use this page as your control panel. Use <strong>?overlay=1</strong> in OBS as the Browser Source URL.</p>

        <div className="card">
          <h2>Teams</h2>
          <div className="grid-two">
            <div>
              <label>Home team</label>
              <input value={state.homeTeam} onChange={(e) => updateState({ homeTeam: e.target.value })} />
            </div>
            <div>
              <label>Away team</label>
              <input value={state.awayTeam} onChange={(e) => updateState({ awayTeam: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Score Controls</h2>
          <div className="grid-two">
            <div className="score-card">
              <h3>{state.homeTeam}</h3>
              <div className="big-score">{state.homeScore}</div>
              <div className="button-row wrap">
                <button onClick={() => updateState({ homeScore: state.homeScore + 4 })}>+4 Try</button>
                <button onClick={() => updateState({ homeScore: state.homeScore + 2 })}>+2 Goal</button>
                <button onClick={() => updateState({ homeScore: state.homeScore + 1 })}>+1 FG</button>
                <button className="secondary" onClick={() => updateState({ homeScore: Math.max(0, state.homeScore - 1) })}>-1</button>
              </div>
            </div>

            <div className="score-card">
              <h3>{state.awayTeam}</h3>
              <div className="big-score">{state.awayScore}</div>
              <div className="button-row wrap">
                <button onClick={() => updateState({ awayScore: state.awayScore + 4 })}>+4 Try</button>
                <button onClick={() => updateState({ awayScore: state.awayScore + 2 })}>+2 Goal</button>
                <button onClick={() => updateState({ awayScore: state.awayScore + 1 })}>+1 FG</button>
                <button className="secondary" onClick={() => updateState({ awayScore: Math.max(0, state.awayScore - 1) })}>-1</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Clock + Match Period</h2>
          <div className="clock-box">{formatTime(state.timeSeconds)}</div>
          <div className="button-row wrap">
            <button onClick={() => updateState({ running: true })}>Start</button>
            <button className="secondary" onClick={() => updateState({ running: false })}>Pause</button>
            <button className="secondary" onClick={() => updateState({ running: false, timeSeconds: 0 })}>Reset Clock</button>
          </div>

          <div className="manual-time-row">
            <input value={manualTime} onChange={(e) => setManualTime(e.target.value)} placeholder="00:00" />
            <button onClick={applyManualTime}>Set Time</button>
          </div>

          <div className="button-row wrap period-buttons">
            {['1st Half', 'Half Time', '2nd Half', 'Full Time'].map((option) => (
              <button
                key={option}
                className={state.period === option ? 'active-pill' : 'secondary'}
                onClick={() => updateState({ period: option })}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>OBS URL</h2>
          <p className="url-box">{window.location.origin + window.location.pathname + '?overlay=1'}</p>
          <p className="subtext">In OBS, add a Browser Source and paste that exact URL. Set width to 1920 and height to 1080.</p>
        </div>

        <div className="button-row wrap">
          <button className="danger" onClick={resetAll}>Reset Entire Match</button>
        </div>
      </div>
    </div>
  );
}

export default App;
