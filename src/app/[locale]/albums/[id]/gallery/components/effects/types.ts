import * as THREE from "three";

export type EffectType = "HEART" | "GALAXY" | "TREE";

export interface EffectLogic {
  /**
   * Calculate target position for a specific item (photo or particle)
   */
  getTargetPosition: (
    index: number,
    total: number,
    isPhoto: boolean,
    time: number,
    isScattered?: boolean,
  ) => THREE.Vector3;

  /**
   * Optional: Get color for a particle (if effect overrides default coloring)
   */
  getParticleColor?: (
    index: number,
    total: number,
    baseColor: THREE.Color,
  ) => THREE.Color;
}
