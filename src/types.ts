export type OrderStatus =
  | "weighing" // 配料中
  | "dyeing" // 打样中
  | "pending_confirm" // 待确认
  | "confirmed" // 已确认（可交接）
  | "delivered" // 已领取（交客户）
  | "returned"; // 已退库

export const STATUS_LABEL: Record<OrderStatus, string> = {
  weighing: "配料中",
  dyeing: "打样中",
  pending_confirm: "待确认",
  confirmed: "已确认",
  delivered: "已领取",
  returned: "已退库",
};

export const STATUS_OPTIONS: OrderStatus[] = [
  "weighing",
  "dyeing",
  "pending_confirm",
  "confirmed",
  "delivered",
  "returned",
];

/** 配方行：逐项称量 */
export interface RecipeLine {
  id: string;
  material: string; // 染料/助剂名称
  targetWeight: number; // 目标重量 g
  actualWeight: number | null; // 实称重量 g
  weighedBy: string | null;
  weighedAt: string | null;
}

/** 称量偏差留痕（偏差 > 0.01g 时自动记录） */
export interface DeviationLog {
  id: string;
  lineId: string;
  material: string;
  targetWeight: number;
  actualWeight: number;
  deviation: number; // 实称 - 目标，g
  operator: string;
  recordedAt: string;
}

/** 保温记录 */
export interface HeatRecord {
  id: string;
  temperature: number; // ℃
  minutes: number; // 保温时长 min
}

/** 质控记录：Lab 三轴读数 + 保温记录 */
export interface QcRecord {
  labL: number;
  labA: number;
  labB: number;
  heatRecords: HeatRecord[];
  inspector: string;
  submittedAt: string;
}

/** 交接记录：领取 / 退库，均关联原打样单 */
export interface HandoverLog {
  id: string;
  type: "delivered" | "returned";
  operator: string; // 经办人
  receiver?: string; // 领取人（领取时）
  reason?: string; // 退回原因（退库时必填）
  at: string;
}

export interface SampleOrder {
  id: string; // 打样单号 DY-xxxx
  orderNo: string; // 客户订单号
  fabric: string; // 布种
  colorNo: string; // 目标色号
  targetLab: { L: number; a: number; b: number } | null; // 目标 Lab（可选，用于 ΔE）
  recipe: RecipeLine[];
  deviations: DeviationLog[];
  status: OrderStatus;
  createdBy: string;
  createdAt: string;
  weighingCompletedAt: string | null;
  qc: QcRecord | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  handovers: HandoverLog[];
  reworkFromId?: string; // 若为重打单，记录来源打样单号
}

/** 退库生成的待重打记录 */
export interface ReworkRecord {
  id: string; // RW-xxxx
  sourceOrderId: string; // 原打样单号
  orderNo: string;
  fabric: string;
  colorNo: string;
  reason: string;
  status: "pending" | "done";
  createdAt: string;
  newOrderId: string | null; // 重打生成的新打样单号
}
