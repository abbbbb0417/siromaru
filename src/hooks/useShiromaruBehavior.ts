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
  const [mousePosState, setMousePosState] = useState<Position>({ x: 0, y: 0 });
  
  const stateTimerRef = useRef<number | null>(null);
  const moveRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const rollVelocityRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const mousePosRef = useRef<Position>({ x: 0, y: 0 });
  const positionRef = useRef<Position>({ x: initialX, y: initialY });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

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

  // Global Mouse Listener for Curiosity
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      setMousePosState({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  // Broadcast Command Listener
  useEffect(() => {
    const handleCommand = (e: Event) => {
      const cmd = (e as CustomEvent).detail;
      if (cmd === 'SQUISH_V') handleSquishV();
      if (cmd === 'SQUISH_H') handleSquishH();
      if (cmd === 'POKE') handlePoke();
    };

    window.addEventListener('shiromaru-command', handleCommand);
    return () => window.removeEventListener('shiromaru-command', handleCommand);
  }, [handlePoke, handleSquishV, handleSquishH]);

  // Random state transitions
  useEffect(() => {
    const pickNextState = () => {
      const rand = Math.random();
      if (rand < 0.35) return 'IDLE';
      if (rand < 0.6) return 'WALK';
      if (rand < 0.7) return 'SIT';
      if (rand < 0.75) return 'SLEEP';
      if (rand < 0.8) return 'ITEM_LEAF';
      if (rand < 0.85) return 'WOBBLE';
      if (rand < 0.9) return 'HAPPY';
      return 'RUN';
    };

    const runStateCycle = () => {
      // Don't transition if interacting
      const interactionStates: BehaviorState[] = ['TRIP', 'POKE', 'SLIDE', 'SQUISH_V', 'SQUISH_H', 'DRAGGING', 'SLEEP', 'ITEM_LEAF', 'WOBBLE', 'HAPPY'];
      if (interactionStates.includes(state)) return;
      if (Object.values(keysRef.current).some(v => v)) return;

      // Mouse curiosity check
      const dx = mousePosRef.current.x - (positionRef.current.x + 30);
      const dy = mousePosRef.current.y - (positionRef.current.y + 30);
      const dist = Math.sqrt(dx * dx + dy * dy);

      let next: BehaviorState;
      if (dist < 100) {
        next = 'LOOK_AT_CURSOR';
      } else if (dist < 300 && Math.random() < 0.4) {
        next = 'FOLLOW_MOUSE';
      } else {
        next = pickNextState();
      }
      
      setState(next);

      if (next === 'WALK' || next === 'RUN') {
        setTargetPos({
          x: Math.random() * (window.innerWidth - 60),
          y: Math.random() * (window.innerHeight - 60)
        });
      }

      if (next === 'SLEEP') {
        // Higher chance to move to the edge before sleeping
        if (Math.random() < 0.7) {
          const side = Math.floor(Math.random() * 4);
          let tx = Math.random() * (window.innerWidth - 60);
          let ty = Math.random() * (window.innerHeight - 60);
          if (side === 0) tx = 10; // Left
          if (side === 1) tx = window.innerWidth - 70; // Right
          if (side === 2) ty = 10; // Top
          if (side === 3) ty = window.innerHeight - 70; // Bottom
          setTargetPos({ x: tx, y: ty });
        }
      }

      // Special behaviors last 45 seconds
      const specialStates: BehaviorState[] = ['SLEEP', 'ITEM_LEAF', 'WOBBLE', 'HAPPY'];
      
      let duration = 2000 + Math.random() * 5000;
      
      if (specialStates.includes(next)) {
        duration = 45000;
        stateTimerRef.current = window.setTimeout(() => {
          setState('IDLE');
          stateTimerRef.current = window.setTimeout(runStateCycle, 1000);
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

        if (state === 'FOLLOW_MOUSE') {
          const moveSpeed = 2;
          const dx = mousePosRef.current.x - (prev.x + 30);
          const dy = mousePosRef.current.y - (prev.y + 30);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 60) {
            nextX += (dx / dist) * moveSpeed;
            nextY += (dy / dist) * moveSpeed;
          } else {
            setState('LOOK_AT_CURSOR');
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
    mousePos: mousePosState,
    handlePoke, 
    handleSquishV, 
    handleSquishH,
    startDragging,
    updateDragging,
    stopDragging
  };
};
