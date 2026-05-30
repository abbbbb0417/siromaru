import React, { useState, useRef, useEffect } from 'react';
import { Shiromaru } from './Shiromaru';
import { useShiromaruBehavior } from '../hooks/useShiromaruBehavior';
import { Orientation } from '../types/behavior';

interface ShiromaruInstanceProps {
  id: string;
  initialX: number;
  initialY: number;
  orientation: Orientation;
  isSensorEnabled: boolean;
  isVanishing?: boolean;
  isGiant?: boolean;
  isMerging?: boolean;
  onSplit: (id: string, x: number, y: number) => void;
  onMerge: (sourceId: string, targetId: string) => void;
  onReportPosition: (id: string, x: number, y: number) => void;
  positionsRef: React.MutableRefObject<Record<string, {x: number, y: number}>>;
}

export const ShiromaruInstance: React.FC<ShiromaruInstanceProps> = ({
  id,
  initialX,
  initialY,
  orientation,
  isSensorEnabled,
  isVanishing,
  isGiant,
  isMerging,
  onSplit,
  onMerge,
  onReportPosition,
  positionsRef
}) => {
  const { 
    state, 
    position, 
    mousePos,
    handlePoke, 
    startDragging,
    updateDragging,
    stopDragging
  } = useShiromaruBehavior(
    initialX,
    initialY,
    orientation,
    isSensorEnabled
  );

  const [isMouseDown, setIsMouseDown] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);
  const lastPositionRef = useRef(position);

  // Keep lastPositionRef up to date and report position
  useEffect(() => {
    lastPositionRef.current = position;
    onReportPosition(id, position.x, position.y);
  }, [position, id, onReportPosition]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsMouseDown(true);
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    longPressTimer.current = window.setTimeout(() => {
      startDragging(clientX, clientY);
    }, 200);
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (state === 'DRAGGING') {
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        updateDragging(clientX, clientY);

        // Check for merge
        const myX = clientX - 30; // Center offset
        const myY = clientY - 30;

        Object.entries(positionsRef.current).forEach(([otherId, pos]) => {
          if (otherId === id) return;
          const dx = myX - pos.x;
          const dy = myY - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40) {
            onMerge(id, otherId);
          }
        });
      }
    };

    const handleGlobalUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

     if (state === 'DRAGGING') {
  stopDragging();
  setIsMouseDown(false);
  clickCountRef.current = 0;
  if (clickTimerRef.current) {
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
  }
  return;
}
      if (isMouseDown) {
        clickCountRef.current += 1;
        
        if (clickCountRef.current === 1) {
          // Start the timer only on the first click
          clickTimerRef.current = window.setTimeout(() => {
            if (clickCountRef.current === 1) {
              handlePoke();
            } else {
              onSplit(id, lastPositionRef.current.x, lastPositionRef.current.y);
            }
            clickCountRef.current = 0;
            clickTimerRef.current = null;
          }, 300);
        }
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
      // We don't clear the click timer here anymore if it's just a re-render
      // But we should clear it if the component unmounts
    };
  }, [state, isMouseDown, startDragging, updateDragging, stopDragging, handlePoke, onSplit, id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  return (
    <Shiromaru 
      state={state} 
      position={position} 
      mousePos={mousePos}
      isVanishing={isVanishing}
      isGiant={isGiant}
      isMerging={isMerging}
      onMouseDown={handleMouseDown}
    />
  );
};
