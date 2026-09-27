export interface LabReading {
  L: number;
  a: number;
  b: number;
}

export interface RecipeItem {
  id: string;
  name: string;
  targetWeight: number; // 目标称量，单位 g
}

export interface WeighRecord {
  id: string;
  itemId: string;
  actualWeight: number;
  deviation: number; // 实称 - 目标
  overTolerance: boolean; // |偏差| > 0.01g
  operator: string;
  time: string; // ISO
}

export interface HoldingRecord {
  id: string;
  temp: number; // 保温温度 ℃
  minutes: number; // 保温时长 min
}

export interface QcRecord {
  lab: LabReading;
  deltaE: number | null; // 有目标 Lab 时计算 ΔE*76
  holdings: HoldingRecord[];
  remark: string;
  operator: string;
  time: string;
}

export type SampleStatus =
  | "待配料"
  | "配料中"
  | "待打样"
  | "待质控"
  | "待确认"
  | "已确认"
  | "已交付"
  | "已退库";

export const STATUS_FLOW: SampleStatus[] = [
  "待配料",
  "配料中",
  "待打样",
  "待质控",
  "待确认",
  "已确认",
  "已交付",
  "已退库",
];

export interface HandoverRecord {
  id: string;
  type: "领取" | "退库";
  person: string;
  time: string;
  reason?: string; // 退库必填
}

export interface SampleOrder {
  id: string; // 打样单号
  orderNo: string; // 客户订单号
  fabric: string; // 布种
  colorNo: string; // 目标色号
  targetLab: LabReading | null;
  liquorRatio: string; // 浴比
  recipe: RecipeItem[];
  status: SampleStatus;
  weighRecords: WeighRecord[];
  qc: QcRecord | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  handovers: HandoverRecord[];
  createdBy: string;
  createdAt: string;
  sourceOrderId?: string; // 由退库重打生成时关联原单
}

export interface ResampleTask {
  id: string;
  sourceOrderId: string;
  reason: string;
  status: "待重打" | "已生成重打单";
  createdAt: string;
  handledByOrderId?: string;
}
