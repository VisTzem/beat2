// src/types/index.ts
export interface TribeStats {
  stamina: number;  // 體力
  strength: number; // 力量
  magic: number;    // 魔力
  goddessBlessing?: boolean;
  stage1?: number;
  stage2?: number;
  stage3?: number;
  stage4?: number;
  stage5?: number;
  stage6?: number;
  [key: string]: any; 
}

export interface AllTribesData {
  [key: string]: TribeStats; 
}

// 新增：關主資料型別
export interface StageMaster {
  name: string;     // 暱稱
  stamina: number;  // 體力
  strength: number; // 力量
  magic: number;    // 魔力
}