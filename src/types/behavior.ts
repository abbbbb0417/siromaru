export type BehaviorState = 
  | 'IDLE' 
  | 'WALK' 
  | 'SIT' 
  | 'SLEEP' 
  | 'RUN' 
  | 'TRIP' 
  | 'POKE' 
  | 'SLIDE'
  | 'SQUISH_V'
  | 'SQUISH_H'
  | 'DRAGGING'
  | 'ITEM_LEAF'
  | 'WOBBLE'
  | 'HAPPY'
  | 'FOLLOW_MOUSE'
  | 'LOOK_AT_CURSOR';

export interface Position {
  x: number;
  y: number;
}

export interface Orientation {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}
