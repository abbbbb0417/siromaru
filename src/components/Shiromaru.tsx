import React from 'react';
import { BehaviorState, Position } from '../types/behavior';
import styles from './Shiromaru.module.css';

interface ShiromaruProps {
  state: BehaviorState;
  position: Position;
  mousePos: Position;
  isVanishing?: boolean;
  isGiant?: boolean;
  isMerging?: boolean;
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
}

export const Shiromaru: React.FC<ShiromaruProps> = ({ state, position, mousePos, isVanishing, isGiant, isMerging, onMouseDown, onDoubleClick }) => {
  const bodyClass = [
    styles.body,
    state === 'IDLE' ? styles.idle : '',
    state === 'SLEEP' ? styles.sleep : '',
    state === 'TRIP' ? styles.trip : '',
    state === 'SQUISH_V' ? styles.squishV : '',
    state === 'SQUISH_H' ? styles.squishH : '',
    state === 'DRAGGING' ? styles.dragging : '',
    state === 'WOBBLE' ? styles.wobble : '',
    state === 'HAPPY' ? styles.happy : '',
    (state === 'WALK' || state === 'RUN' || state === 'FOLLOW_MOUSE') ? styles.walking : '',
    state === 'LOOK_AT_CURSOR' ? styles.looking : '',
    isGiant ? styles.giant : ''
  ].join(' ');

  // Calculate eye offset based on mouse position
  const dx = mousePos.x - (position.x + 30);
  const dy = mousePos.y - (position.y + 30);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxOffset = 3;
  const offsetX = dist > 0 ? (dx / dist) * Math.min(dist / 50, maxOffset) : 0;
  const offsetY = dist > 0 ? (dy / dist) * Math.min(dist / 50, maxOffset) : 0;

  const eyeStyle = (state === 'LOOK_AT_CURSOR' || state === 'FOLLOW_MOUSE') ? {
    transform: `translate(${offsetX}px, ${offsetY}px)`
  } : {};

  return (
    <div 
      className={`${styles.container} ${isVanishing ? styles.vanishing : ''}`}
      style={{ 
        left: position.x, 
        top: position.y,
        zIndex: state === 'DRAGGING' ? 1000 : 10,
        transition: state === 'DRAGGING' ? 'none' : 'transform 0.1s ease-out'
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className={bodyClass}>
        {isVanishing && (
          <>
            <div className={`${styles.particle} ${styles.p1}`} />
            <div className={`${styles.particle} ${styles.p2}`} />
            <div className={`${styles.particle} ${styles.p3}`} />
            <div className={`${styles.particle} ${styles.p4}`} />
            <div className={`${styles.particle} ${styles.p5}`} />
          </>
        )}
        {isMerging && (
          <>
            <div className={`${styles.mergeParticle} ${styles.mp1}`} />
            <div className={`${styles.mergeParticle} ${styles.mp2}`} />
            <div className={`${styles.mergeParticle} ${styles.mp3}`} />
            <div className={`${styles.mergeParticle} ${styles.mp4}`} />
            <div className={`${styles.mergeParticle} ${styles.mp5}`} />
            <div className={`${styles.mergeParticle} ${styles.mp6}`} />
            <div className={`${styles.mergeParticle} ${styles.mp7}`} />
            <div className={`${styles.mergeParticle} ${styles.mp8}`} />
          </>
        )}
        {state === 'ITEM_LEAF' && <div className={`${styles.item} ${styles.leaf}`} />}
        {state === 'HAPPY' && (
          <>
            <div className={`${styles.note} ${styles.note1}`}>♪</div>
            <div className={`${styles.note} ${styles.note2}`}>♪</div>
            <div className={`${styles.note} ${styles.note3}`}>♪</div>
          </>
        )}
        <div className={`${styles.eye} ${styles.eyeLeft}`} style={eyeStyle} />
        <div className={`${styles.eye} ${styles.eyeRight}`} style={eyeStyle} />
        <div className={`${styles.leg} ${styles.legLeft}`} />
        <div className={`${styles.leg} ${styles.legRight}`} />
      </div>
    </div>
  );
};
