import React, { useState, useEffect } from 'react';
import { ShiromaruInstance } from './components/ShiromaruInstance';
import { Orientation } from './types/behavior';

interface ShiromaruData {
  id: string;
  initialX: number;
  initialY: number;
  isVanishing?: boolean;
  createdAt?: number;
}

const App: React.FC = () => {
  const [isSensorEnabled, setIsSensorEnabled] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>({ alpha: null, beta: null, gamma: null });
  const [shiromarus, setShiromarus] = useState<ShiromaruData[]>([
    { id: 'original', initialX: window.innerWidth / 2 - 30, initialY: window.innerHeight / 2 - 30, isVanishing: false }
  ]);

  useEffect(() => {
    if (!isSensorEnabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setOrientation({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isSensorEnabled]);

  // Handle split lifetime management
  useEffect(() => {
    if (isPersistenceEnabled) {
      // If persistence is enabled, ensure no one is in vanishing state (except if they were already scheduled to)
      // Actually, if persistence is ON, we just stop the timer.
      // But what if someone was already vanishing?
      setShiromarus(prev => prev.map(s => s.id !== 'original' ? { ...s, isVanishing: false } : s));
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setShiromarus(prev => {
        let changed = false;
        const next = prev.map(s => {
          if (s.id === 'original' || !s.createdAt) return s;
          const age = now - s.createdAt;
          
          // 44s for vanishing state
          if (age > 44000 && !s.isVanishing) {
            changed = true;
            return { ...s, isVanishing: true };
          }
          return s;
        }).filter(s => {
          if (s.id === 'original' || !s.createdAt) return true;
          const age = now - s.createdAt;
          // 45s for removal
          if (age > 45000) {
            changed = true;
            return false;
          }
          return true;
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPersistenceEnabled]);

  const toggleSensor = async () => {
    if (!isSensorEnabled) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            setIsSensorEnabled(true);
          }
        } catch (err) {
          console.error('Permission denied', err);
        }
      } else {
        setIsSensorEnabled(true);
      }
    } else {
      setIsSensorEnabled(false);
    }
  };

  const broadcastCommand = (cmd: string) => {
    window.dispatchEvent(new CustomEvent('shiromaru-command', { detail: cmd }));
  };

  const handleSplit = (_id: string, x: number, y: number) => {
    const newId = 'split-' + Date.now();
    const newShiromaru: ShiromaruData = {
      id: newId,
      initialX: x + 20,
      initialY: y + 20,
      isVanishing: false,
      createdAt: Date.now()
    };
    
    setShiromarus(prev => [...prev, newShiromaru]);
  };

  const btnStyle = {
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid #eee',
    backgroundColor: 'rgba(255,255,255,0.8)',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
    userSelect: 'none' as const
  };

  const labelStyle = { 
    fontSize: '12px', 
    color: '#888', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px',
    cursor: 'pointer',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid #eee'
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {shiromarus.map(s => (
        <ShiromaruInstance
          key={s.id}
          id={s.id}
          initialX={s.initialX}
          initialY={s.initialY}
          orientation={orientation}
          isSensorEnabled={isSensorEnabled}
          isVanishing={s.isVanishing}
          onSplit={handleSplit}
        />
      ))}
      
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnStyle} onClick={() => broadcastCommand('SQUISH_V')}>上からつぶす</button>
          <button style={btnStyle} onClick={() => broadcastCommand('SQUISH_H')}>横からつぶす</button>
          <button style={btnStyle} onClick={() => broadcastCommand('POKE')}>転がす</button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={labelStyle}>
            <span>分裂を維持 {isPersistenceEnabled ? 'ON' : 'OFF'}</span>
            <input 
              type="checkbox" 
              checked={isPersistenceEnabled} 
              onChange={() => setIsPersistenceEnabled(!isPersistenceEnabled)} 
              style={{ width: '16px', height: '16px' }}
            />
          </label>
          <label style={labelStyle}>
            <span>傾きセンサー {isSensorEnabled ? 'ON' : 'OFF'}</span>
            <input 
              type="checkbox" 
              checked={isSensorEnabled} 
              onChange={toggleSensor} 
              style={{ width: '16px', height: '16px' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default App;
