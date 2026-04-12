import { useState, useRef, useEffect } from 'react';
import './BubbleMenu.css';

function animateTo(el, from, to, duration, ease, onDone) {
  const start = performance.now();
  function tick() {
    const t = Math.min((performance.now() - start) / duration, 1);
    const eased = ease(t);
    el.style.setProperty('--edge-proximity', from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(tick);
    else if (onDone) onDone();
  }
  requestAnimationFrame(tick);
}

const BubbleMenu = ({ items = [], onNavigate }) => {
  const [open, setOpen] = useState(false);

  function handleToggle() { setOpen(v => !v); }

  function handleNav(path) {
    setOpen(false);
    onNavigate?.(path);
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={handleToggle}
        className={`bubble-toggle ${open ? 'open' : ''}`}
        aria-label="Toggle menu"
      >
        <span className="bline" />
        <span className="bline short" />
      </button>

      {/* Overlay menu */}
      {open && (
        <div className="bubble-overlay" onClick={() => setOpen(false)}>
          <ul className="bubble-list" onClick={e => e.stopPropagation()}>
            {items.map((item, i) => (
              <li key={item.path} className="bubble-item" style={{ animationDelay: `${i * 0.06}s` }}>
                <button
                  className="bubble-pill"
                  onClick={() => handleNav(item.path)}
                  style={{ '--pill-color': item.color || '#a78bfa' }}
                >
                  <span className="bubble-icon">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default BubbleMenu;
