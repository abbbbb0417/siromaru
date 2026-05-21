import React from 'react';
import { BehaviorState, Position } from '../types/behavior';
import styles from './Shiromaru.module.css';

interface ShiromaruProps {
  state: BehaviorState;
  position: Position;
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const Shiromaru: React.FC<ShiromaruProps> = ({ state, position, onMouseDown }) => {
  const bodyClass = [
    styles.body,
    state === 'IDLE' ? styles.idle : '',
    state === 'SLEEP' ? styles.sleep : '',
    state === 'TRIP' ? styles.trip : '',
    state === 'SQUISH_V' ? styles.squishV : '',
    state === 'SQUISH_H' ? styles.squishH : '',
    state === 'DRAGGING' ? styles.dragging : '',
    state === 'WOBBLE' ? styles.wobble : '',
    (state === 'WALK' || state === 'RUN') ? styles.walking : ''
  ].join(' ');

  return (
    <div 
      className={styles.container}
      style={{ 
        left: position.x, 
        top: position.y,
        zIndex: state === 'DRAGGING' ? 1000 : 10,
        transition: state === 'DRAGGING' ? 'none' : 'transform 0.1s ease-out'
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      <div className={bodyClass}>
        {state === 'ITEM_LEAF' && <div className={`${styles.item} ${styles.leaf}`} />}
        <div className={`${styles.eye} ${styles.eyeLeft}`} />
        <div className={`${styles.eye} ${styles.eyeRight}`} />
        <div className={`${styles.leg} ${styles.legLeft}`} />
        <div className={`${styles.leg} ${styles.legRight}`} />
      </div>
    </div>
  );
};
