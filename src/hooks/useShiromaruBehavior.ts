import { useState, useEffect, useRef, useCallback } from 'react';
import { BehaviorState, Position, Orientation } from '../types/behavior';

export const useShiromaruBehavior = (
  initialX: number,
  initialY: number,
  orientation: Orientation,
  isSensorEnabled: boolean
) => {
  const [state, setState] = useState<BehaviorState>('IDLE');
  const [position, setPosition] = useState<Position>({ x: initialX, y: initialY });
  const [targetPos, setTargetPos] = useState<Position | null>(null);
  
  const stateTimerRef = useRef<number | null>(null);
  const moveRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const rollVelocityRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  const handlePoke = useCallback(() => {
    setState('TRIP');
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    
    // Set a random roll direction and speed
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 5;
    rollVelocityRef.current = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };

    setTimeout(() => {
      setState('IDLE');
      rollVelocityRef.current = { x: 0, y: 0 };
    }, 2000);
  }, []);

  const handleSquishV = useCallback(() => {
    setState('SQUISH_V');
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    setTimeout(() => setState('IDLE'), 2000);
  }, []);

  const handleSquishH = useCallback(() => {
    setState('SQUISH_H');
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    setTimeout(() => setState('IDLE'), 2000);
  }, []);

  const startDragging = useCallback((_x: number, _y: number) => {
    setState('DRAGGING');
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    setTargetPos(null);
  }, []);

  const updateDragging = useCallback((x: number, y: number) => {
    setPosition({ x: x - 30, y: y - 30 });
  }, []);

  const stopDragging = useCallback(() => {
    setState('IDLE');
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === 'Control') handleSquishV();
      if (e.key === 'Shift') handleSquishH();
      if (e.key === ' ') handlePoke();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePoke, handleSquishV, handleSquishH]);

  // Random state transitions
  useEffect(() => {
    const pickNextState = () => {
      const rand = Math.random();
      if (rand < 0.6) return 'IDLE';
      if (rand < 0.8) return 'WALK';
      if (rand < 0.9) return 'SIT';
      if (rand < 0.93) return 'SLEEP';
      if (rand < 0.97) return 'ITEM_LEAF';
      return 'RUN';
    };

    const runStateCycle = () => {
      // Don't transition if interacting
      const interactionStates: BehaviorState[] = ['TRIP', 'POKE', 'SLIDE', 'SQUISH_V', 'SQUISH_H', 'DRAGGING', 'ITEM_LEAF'];
      if (interactionStates.includes(state)) return;
      if (Object.values(keysRef.current).some(v => v)) return;

      const next = pickNextState();
      setState(next);

      if (next === 'WALK' || next === 'RUN') {
        setTargetPos({
          x: Math.random() * (window.innerWidth - 60),
          y: Math.random() * (window.innerHeight - 60)
        });
      }

      // Default duration
      let duration = 2000 + Math.random() * 5000;

      // Custom duration for items
      if (next === 'ITEM_LEAF') {
        duration = 10000; // 10 seconds
        stateTimerRef.current = window.setTimeout(() => {
          setState('IDLE');
        }, duration);
        return;
      }

      stateTimerRef.current = window.setTimeout(runStateCycle, duration);
    };

    runStateCycle();
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    };
  }, [state]);

  // Movement Logic
  useEffect(() => {
    const move = () => {
      setPosition(prev => {
        if (state === 'DRAGGING') return prev; // Dragging is handled elsewhere

        let nextX = prev.x;
        let nextY = prev.y;
        let movingManually = false;

        const speed = 3;
        if (keysRef.current['ArrowUp']) { nextY -= speed; movingManually = true; }
        if (keysRef.current['ArrowDown']) { nextY += speed; movingManually = true; }
        if (keysRef.current['ArrowLeft']) { nextX -= speed; movingManually = true; }
        if (keysRef.current['ArrowRight']) { nextX += speed; movingManually = true; }

        if (movingManually) {
          if (state !== 'WALK') setState('WALK');
          setTargetPos(null);
        }

        // Rolling Momentum
        if (state === 'TRIP') {
          nextX += rollVelocityRef.current.x;
          nextY += rollVelocityRef.current.y;
          // Apply friction
          rollVelocityRef.current.x *= 0.98;
          rollVelocityRef.current.y *= 0.98;
        }

        if (!movingManually && isSensorEnabled && orientation.beta !== null && orientation.gamma !== null) {
          const dx = orientation.gamma * 0.2;
          const dy = orientation.beta * 0.2;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            nextX += dx;
            nextY += dy;
            if (state !== 'TRIP') setState('SLIDE');
          } else if (state === 'SLIDE') {
            setState('IDLE');
          }
        }

        if ((state === 'WALK' || state === 'RUN') && targetPos) {
          const moveSpeed = state === 'RUN' ? 5 : 1.5;
          const dx = targetPos.x - prev.x;
          const dy = targetPos.y - prev.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 5) {
            nextX += (dx / dist) * moveSpeed;
            nextY += (dy / dist) * moveSpeed;
          } else {
            setTargetPos(null);
            setState('IDLE');
          }
        }

        const margin = 10;
        const maxX = window.innerWidth - 60 - margin;
        const maxY = window.innerHeight - 60 - margin;
        
        if (nextX < margin) nextX = margin;
        if (nextX > maxX) nextX = maxX;
        if (nextY < margin) nextY = margin;
        if (nextY > maxY) nextY = maxY;

        if (nextX < -100 || nextX > window.innerWidth + 100 || nextY < -100 || nextY > window.innerHeight + 100) {
          nextX = window.innerWidth / 2 - 30;
          nextY = window.innerHeight / 2 - 30;
        }

        return { x: nextX, y: nextY };
      });

      moveRef.current = requestAnimationFrame(move);
    };

    moveRef.current = requestAnimationFrame(move);
    return () => {
      if (moveRef.current) cancelAnimationFrame(moveRef.current);
    };
  }, [state, targetPos, isSensorEnabled, orientation]);

  return { 
    state, 
    position, 
    handlePoke, 
    handleSquishV, 
    handleSquishH,
    startDragging,
    updateDragging,
    stopDragging
  };
};
