import React, { useState, useEffect, useRef } from 'react';
import { Shiromaru } from './components/Shiromaru';
import { useShiromaruBehavior } from './hooks/useShiromaruBehavior';
import { Orientation } from './types/behavior';

const App: React.FC = () => {
  const [isSensorEnabled, setIsSensorEnabled] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>({ alpha: null, beta: null, gamma: null });

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

  const toggleSensor = async () => {
    if (!isSensorEnabled) {
      // Check for iOS permission requirement
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

  const { 
    state, 
    position, 
    handlePoke, 
    handleSquishV, 
    handleSquishH,
    startDragging,
    updateDragging,
    stopDragging
  } = useShiromaruBehavior(
    window.innerWidth / 2 - 30,
    window.innerHeight / 2 - 30,
    orientation,
    isSensorEnabled
  );

  const [isMouseDown, setIsMouseDown] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsMouseDown(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    longPressTimer.current = window.setTimeout(() => {
      startDragging(clientX, clientY);
    }, 200); // Trigger drag after 200ms
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (state === 'DRAGGING') {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        updateDragging(clientX, clientY);
      }
    };

    const handleGlobalUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (state === 'DRAGGING') {
        stopDragging();
      } else if (isMouseDown) {
        handlePoke(); // If it wasn't a long press, it's a poke
      }
      setIsMouseDown(false);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [state, isMouseDown, startDragging, updateDragging, stopDragging, handlePoke]);

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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Shiromaru state={state} position={position} onMouseDown={handleMouseDown} />
      
      {/* Control Panel */}
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
          <button style={btnStyle} onClick={handleSquishV}>上からつぶす</button>
          <button style={btnStyle} onClick={handleSquishH}>横からつぶす</button>
          <button style={btnStyle} onClick={handlePoke}>転がす</button>
        </div>
        <label style={{ 
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
        }}>
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
  );
};

export default App;
