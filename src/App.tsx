import React, { useState, useEffect, useRef } from 'react';
import { ShiromaruInstance } from './components/ShiromaruInstance';
import { Orientation } from './types/behavior';

interface ShiromaruData {
  id: string;
  initialX: number;
  initialY: number;
  isVanishing?: boolean;
  createdAt?: number;
  isGiant?: boolean;
  isMerging?: boolean;
}

const App: React.FC = () => {
  const [isSensorEnabled, setIsSensorEnabled] = useState(false);
  const [isPersistenceEnabled, setIsPersistenceEnabled] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [orientation, setOrientation] = useState<Orientation>({ alpha: null, beta: null, gamma: null });
  const [shiromarus, setShiromarus] = useState<ShiromaruData[]>([
    { id: 'original', initialX: window.innerWidth / 2 - 30, initialY: window.innerHeight / 2 - 30, isVanishing: false }
  ]);
  const positionsRef = useRef<Record<string, {x: number, y: number}>>({});
  
  const mergeTimerRef = useRef<Record<string, number>>({});
  const mergingEffectTimerRef = useRef<Record<string, number>>({});

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

  useEffect(() => {
    if (isPersistenceEnabled) {
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
          if (age > 44000 && !s.isVanishing) {
            changed = true;
            return { ...s, isVanishing: true };
          }
          return s;
        }).filter(s => {
          if (s.id === 'original' || !s.createdAt) return true;

          const age = now - s.createdAt;
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
  }, [isPersistenceEnabled, shiromarus.length]);

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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(mergeTimerRef.current).forEach(clearTimeout);
      Object.values(mergingEffectTimerRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleMerge = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const actualSource = targetId === 'original' ? 'original' : sourceId;
    const actualTarget = targetId === 'original' ? sourceId : targetId;

    setShiromarus(prev => {
      const targetExists = prev.find(s => s.id === actualTarget);
      if (!targetExists) return prev;

      return prev.filter(s => s.id !== actualTarget).map(s => {
        if (s.id === actualSource) {
          const updated = { ...s, isGiant: true, isMerging: true };
          if (s.id === 'original') {
            delete updated.createdAt;
          } else {
            updated.createdAt = Date.now();
          }
          return updated;
        }
        return s;
      });
    });

    delete positionsRef.current[actualTarget];

    // エフェクト（黄色い枠線と粒子）は1秒で消す
    if (mergingEffectTimerRef.current[actualSource]) {
      clearTimeout(mergingEffectTimerRef.current[actualSource]);
    }
    mergingEffectTimerRef.current[actualSource] = window.setTimeout(() => {
      setShiromarus(prev => prev.map(s =>
        s.id === actualSource ? { ...s, isMerging: false } : s
      ));
      delete mergingEffectTimerRef.current[actualSource];
    }, 1000);

    // 巨大化状態は30秒維持
    if (mergeTimerRef.current[actualSource]) {
      clearTimeout(mergeTimerRef.current[actualSource]);
    }
    mergeTimerRef.current[actualSource] = window.setTimeout(() => {
      setShiromarus(prev => prev.map(s =>
        s.id === actualSource ? { ...s, isGiant: false } : s
      ));
      delete mergeTimerRef.current[actualSource];
    }, 30000);
  };

  const handleReportPosition = (id: string, x: number, y: number) => {
    positionsRef.current[id] = { x, y };
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
          isGiant={s.isGiant}
          isMerging={s.isMerging}
          onSplit={handleSplit}
          onMerge={handleMerge}
          onReportPosition={handleReportPosition}
          positionsRef={positionsRef}
        />
      ))}

      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid #ddd',
          backgroundColor: '#fff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 110,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '20px'
        }}
      >
        {isPanelOpen ? '×' : '⚙️'}
      </button>

      <div style={{
        position: 'absolute',
        bottom: '70px',
        right: '20px',
        width: '260px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isPanelOpen ? 1 : 0,
        transform: isPanelOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        pointerEvents: isPanelOpen ? 'auto' : 'none'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase' }}>アクション</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button style={btnStyle} onClick={() => broadcastCommand('SQUISH_V')}>上から</button>
            <button style={btnStyle} onClick={() => broadcastCommand('SQUISH_H')}>横から</button>
            <button style={btnStyle} onClick={() => broadcastCommand('POKE')}>転がす</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase' }}>設定</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>
              <span>分裂を維持</span>
              <input
                type="checkbox"
                checked={isPersistenceEnabled}
                onChange={() => setIsPersistenceEnabled(!isPersistenceEnabled)}
                style={{ width: '16px', height: '16px' }}
              />
            </label>
            <label style={labelStyle}>
              <span>傾きセンサー</span>
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
    </div>
  );
};

export default App;