import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { wordLevels } from './words';

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

const levelLabels = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  hard: 'Advanced'
};

function shuffleWords(words) {
  const shuffled = [...words];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function makeMask(word) {
  const clean = word.toLowerCase();
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  const indexes = clean
    .split('')
    .map((char, index) => (vowels.has(char) ? index : null))
    .filter((index) => index !== null);

  const hidden = indexes.length > 1 ? indexes : [Math.max(1, clean.length - 2)];
  return clean.split('').map((char, index) => (hidden.includes(index) ? '_' : char));
}

function App() {
  const shuffledLevels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(wordLevels).map(([levelName, words]) => [levelName, shuffleWords(words)])
      ),
    []
  );
  const [level, setLevel] = useState('basic');
  const [wordIndex, setWordIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const inputRefs = useRef([]);

  const words = shuffledLevels[level];
  const current = words[wordIndex];
  const mask = useMemo(() => makeMask(current.word), [current.word]);
  const key = `${level}-${wordIndex}`;
  const typed = answers[key] ?? mask.map(() => '');

  const guess = current.word
    .toLowerCase()
    .split('')
    .map((char, index) => (mask[index] === '_' ? typed[index] || '' : char))
    .join('');

  const filled = mask.every((char, index) => char !== '_' || typed[index]);
  const correct = filled && guess === current.word.toLowerCase();
  const incorrect = filled && !correct;

  function focusInput(index) {
    const nextInput = inputRefs.current[index];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  }

  function updateAnswer(index, value, shouldAdvance = false) {
    const letter = value.toLowerCase().replace(/[^a-z]/g, '').slice(-1);
    const next = [...typed];
    next[index] = letter;
    setAnswers((prev) => ({ ...prev, [key]: next }));

    if (letter && shouldAdvance) {
      const nextBlank = mask.findIndex((char, nextIndex) => char === '_' && nextIndex > index);
      if (nextBlank !== -1) {
        window.requestAnimationFrame(() => focusInput(nextBlank));
      }
    }
  }

  function handleInputKeyDown(event, index) {
    if (event.key === 'Backspace' && !typed[index]) {
      const previousBlank = mask
        .map((char, charIndex) => (char === '_' && charIndex < index ? charIndex : null))
        .filter((charIndex) => charIndex !== null)
        .pop();

      if (previousBlank !== undefined) {
        window.requestAnimationFrame(() => focusInput(previousBlank));
      }
    }
  }

  function chooseLetter(letter) {
    const targetIndex = mask.findIndex((char, index) => char === '_' && !typed[index]);
    if (targetIndex !== -1) {
      updateAnswer(targetIndex, letter);
    }
  }

  function move(direction) {
    setWordIndex((index) => (index + direction + words.length) % words.length);
  }

  function changeLevel(nextLevel) {
    setLevel(nextLevel);
    setWordIndex(0);
  }

  function resetWord() {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function playSound() {
    if (current.audioUrl) {
      new Audio(current.audioUrl).play();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(current.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.82;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className='header-container'>
          <h1>Hangman</h1>
        <label className="level-picker">
          <span>Level</span>
          <select value={level} onChange={(event) => changeLevel(event.target.value)}>
            {Object.entries(levelLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        </div>
      </header>

      <section className="game-stage" aria-live="polite">
        <button className="edge-arrow left" aria-label="Previous word" onClick={() => move(-1)}>
          ‹
        </button>

        <article className="word-card">
          <div className="image-panel">
            <img src={current.image} alt={current.imageAlt} />
            <span className="word-count">
              {wordIndex + 1}/{words.length}
            </span>
          </div>    
          <div className="prompt-row">
            <p>{current.clue}</p>
          </div>      

          <div
            className="answer-row"
            style={{ '--letter-count': current.word.length }}
            aria-label={`Spell ${current.clue}`}
          >
            {mask.map((char, index) =>
              char === '_' ? (
                <input
                  key={`${current.word}-${index}`}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  value={typed[index] ?? ''}
                  onChange={(event) => updateAnswer(index, event.target.value, true)}
                  onKeyDown={(event) => handleInputKeyDown(event, index)}
                  maxLength={1}
                  inputMode="text"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  aria-label={`Missing letter ${index + 1}`}
                />
              ) : (
                <span key={`${current.word}-${index}`} className="fixed-letter">
                  {char}
                </span>
              )
            )}
          </div>

           

          <div className="actions">
            <button type="button" className="icon-button" onClick={resetWord} aria-label="Try again">
              ↻
            </button>
            <button type="button" className="sound-button" onClick={playSound} disabled={!correct}>
              🔊 Sound
            </button>
            <button type="button" className="next-button" onClick={() => move(1)} disabled={!correct}>
              Next ›
            </button>
             <span className={`status-mark ${correct ? 'good' : incorrect ? 'bad' : ''}`}>
              {correct ? '✓' : incorrect ? '×' : ''}
            </span>
          </div>
        </article>

        <button className="edge-arrow right" aria-label="Next word" onClick={() => move(1)}>
          ›
        </button>
      </section>

      <section className="keyboard" aria-label="Letter choices">
        {alphabet.map((letter) => (
          <button key={letter} type="button" onClick={() => chooseLetter(letter)} disabled={correct}>
            {letter}
          </button>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
