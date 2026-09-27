import {
  LabReading,
  ResampleTask,
  SampleOrder,
  SampleStatus,
  WeighRecord,
} from "./types";

export const TOLERANCE = 0.01; // 称量允差 ±0.01g

const ORDER_KEY = "dye-lab-orders-v1";
const RESAMPLE_KEY = "dye-lab-resamples-v1";

let seq = 0;
export function genId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function nextOrderNo(orders: SampleOrder[]): string {
  return `DY-${String(orders.length + 1).padStart(4, "0")}`;
}

export function calcDeltaE(x: LabReading, y: LabReading): number {
  return Math.sqrt((x.L - y.L) ** 2 + (x.a - y.a) ** 2 + (x.b - y.b) ** 2);
}

/** 每个配方项最近一次称量记录 */
export function latestWeighMap(order: SampleOrder): Map<string, WeighRecord> {
  const map = new Map<string, WeighRecord>();
  for (const rec of order.weighRecords) map.set(rec.itemId, rec);
  return map;
}

/** 阻止“完成配料”的原因列表；为空表示可完成 */
export function weighingBlockers(order: SampleOrder): string[] {
  const latest = latestWeighMap(order);
  const problems: string[] = [];
  for (const item of order.recipe) {
    const rec = latest.get(item.id);
    if (!rec) {
      problems.push(`「${item.name}」尚未称量`);
    } else if (rec.overTolerance) {
      problems.push(
        `「${item.name}」最近偏差 ${fmtDev(rec.deviation)}g，超过 ±${TOLERANCE}g，需重新称量`
      );
    }
  }
  return problems;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export function fmtDev(d: number): string {
  return (d >= 0 ? "+" : "") + d.toFixed(3);
}

export const STATUS_CLASS: Record<SampleStatus, string> = {
  待配料: "badge gray",
  配料中: "badge blue",
  待打样: "badge indigo",
  待质控: "badge orange",
  待确认: "badge amber",
  已确认: "badge green",
  已交付: "badge teal",
  已退库: "badge purple",
};

export function loadOrders(): SampleOrder[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) return JSON.parse(raw) as SampleOrder[];
  } catch {
    /* ignore */
  }
  return seedOrders();
}

export function loadResamples(): ResampleTask[] {
  try {
    const raw = localStorage.getItem(RESAMPLE_KEY);
    if (raw) return JSON.parse(raw) as ResampleTask[];
  } catch {
    /* ignore */
  }
  return seedResamples();
}

export function saveOrders(orders: SampleOrder[]): void {
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
}

export function saveResamples(tasks: ResampleTask[]): void {
  localStorage.setItem(RESAMPLE_KEY, JSON.stringify(tasks));
}

function seedOrders(): SampleOrder[] {
  return [
    {
      id: "DY-0001",
      orderNo: "SO-2026-0188",
      fabric: "棉府绸 40s",
      colorNo: "C-5021 藏青",
      targetLab: { L: 28.4, a: 4.1, b: -22.6 },
      liquorRatio: "1:20",
      recipe: [
        { id: "r1", name: "活性藏青 BF", targetWeight: 2.4 },
        { id: "r2", name: "活性红 3BS", targetWeight: 0.35 },
        { id: "r3", name: "元明粉", targetWeight: 40 },
        { id: "r4", name: "纯碱", targetWeight: 12 },
      ],
      status: "待确认",
      weighRecords: [
        { id: "w1", itemId: "r1", actualWeight: 2.402, deviation: 0.002, overTolerance: false, operator: "王工", time: "2026-09-24T09:12:00" },
        { id: "w2", itemId: "r2", actualWeight: 0.348, deviation: -0.002, overTolerance: false, operator: "王工", time: "2026-09-24T09:14:00" },
        { id: "w3", itemId: "r3", actualWeight: 40.035, deviation: 0.035, overTolerance: true, operator: "王工", time: "2026-09-24T09:16:00" },
        { id: "w4", itemId: "r3", actualWeight: 40.004, deviation: 0.004, overTolerance: false, operator: "王工", time: "2026-09-24T09:21:00" },
        { id: "w5", itemId: "r4", actualWeight: 12.006, deviation: 0.006, overTolerance: false, operator: "王工", time: "2026-09-24T09:23:00" },
      ],
      qc: {
        lab: { L: 28.9, a: 3.8, b: -21.9 },
        deltaE: 0.9,
        holdings: [{ id: "h1", temp: 60, minutes: 30 }],
        remark: "皂洗后复检一次，色相略浅",
        operator: "李婷",
        time: "2026-09-25T14:40:00",
      },
      confirmedBy: null,
      confirmedAt: null,
      handovers: [],
      createdBy: "王工",
      createdAt: "2026-09-24T08:55:00",
    },
    {
      id: "DY-0002",
      orderNo: "SO-2026-0191",
      fabric: "涤纶针织",
      colorNo: "P-1180 荧光橙",
      targetLab: { L: 62.5, a: 48.2, b: 41.0 },
      liquorRatio: "1:15",
      recipe: [
        { id: "r1", name: "分散橙 S-4RL", targetWeight: 1.8 },
        { id: "r2", name: "分散红玉 S-5BL", targetWeight: 0.22 },
        { id: "r3", name: "匀染剂", targetWeight: 0.5 },
        { id: "r4", name: "醋酸", targetWeight: 0.3 },
      ],
      status: "配料中",
      weighRecords: [
        { id: "w1", itemId: "r1", actualWeight: 1.798, deviation: -0.002, overTolerance: false, operator: "赵敏", time: "2026-09-26T10:05:00" },
      ],
      qc: null,
      confirmedBy: null,
      confirmedAt: null,
      handovers: [],
      createdBy: "赵敏",
      createdAt: "2026-09-26T09:50:00",
    },
    {
      id: "DY-0003",
      orderNo: "SO-2026-0155",
      fabric: "T/C 混纺斜纹",
      colorNo: "M-3307 军绿",
      targetLab: { L: 35.2, a: -6.4, b: 8.9 },
      liquorRatio: "1:20",
      recipe: [
        { id: "r1", name: "分散绿 6B", targetWeight: 1.2 },
        { id: "r2", name: "活性黄 3RS", targetWeight: 0.85 },
        { id: "r3", name: "元明粉", targetWeight: 30 },
      ],
      status: "已交付",
      weighRecords: [
        { id: "w1", itemId: "r1", actualWeight: 1.201, deviation: 0.001, overTolerance: false, operator: "王工", time: "2026-09-20T08:40:00" },
        { id: "w2", itemId: "r2", actualWeight: 0.852, deviation: 0.002, overTolerance: false, operator: "王工", time: "2026-09-20T08:42:00" },
        { id: "w3", itemId: "r3", actualWeight: 29.995, deviation: -0.005, overTolerance: false, operator: "王工", time: "2026-09-20T08:45:00" },
      ],
      qc: {
        lab: { L: 35.0, a: -6.1, b: 8.6 },
        deltaE: 0.42,
        holdings: [{ id: "h1", temp: 130, minutes: 20 }],
        remark: "色差在客户允差内",
        operator: "李婷",
        time: "2026-09-21T11:20:00",
      },
      confirmedBy: "张主管",
      confirmedAt: "2026-09-21T16:05:00",
      handovers: [
        { id: "t1", type: "领取", person: "客户·陈小姐", time: "2026-09-22T10:30:00" },
      ],
      createdBy: "王工",
      createdAt: "2026-09-20T08:30:00",
    },
    {
      id: "DY-0004",
      orderNo: "SO-2026-0142",
      fabric: "锦纶塔夫绸",
      colorNo: "N-0712 酒红",
      targetLab: { L: 32.0, a: 38.5, b: 12.4 },
      liquorRatio: "1:25",
      recipe: [
        { id: "r1", name: "酸性红 B", targetWeight: 1.5 },
        { id: "r2", name: "酸性黄 2G", targetWeight: 0.4 },
      ],
      status: "已退库",
      weighRecords: [
        { id: "w1", itemId: "r1", actualWeight: 1.503, deviation: 0.003, overTolerance: false, operator: "赵敏", time: "2026-09-18T09:02:00" },
        { id: "w2", itemId: "r2", actualWeight: 0.398, deviation: -0.002, overTolerance: false, operator: "赵敏", time: "2026-09-18T09:05:00" },
      ],
      qc: {
        lab: { L: 32.6, a: 37.2, b: 11.8 },
        deltaE: 1.5,
        holdings: [{ id: "h1", temp: 98, minutes: 40 }],
        remark: "D65 下可接受，TL84 下偏红",
        operator: "李婷",
        time: "2026-09-18T15:10:00",
      },
      confirmedBy: "张主管",
      confirmedAt: "2026-09-18T17:00:00",
      handovers: [
        { id: "t1", type: "领取", person: "客户·刘先生", time: "2026-09-19T09:20:00" },
        { id: "t2", type: "退库", person: "客户·刘先生", time: "2026-09-23T14:10:00", reason: "客户对色光源下偏红，ΔE 超客户允差 1.0，要求重打" },
      ],
      createdBy: "赵敏",
      createdAt: "2026-09-18T08:45:00",
    },
    {
      id: "DY-0005",
      orderNo: "SO-2026-0203",
      fabric: "人棉贡缎",
      colorNo: "R-2240 雾蓝",
      targetLab: null,
      liquorRatio: "1:20",
      recipe: [
        { id: "r1", name: "活性蓝 BRF", targetWeight: 1.1 },
        { id: "r2", name: "纯碱", targetWeight: 10 },
      ],
      status: "待配料",
      weighRecords: [],
      qc: null,
      confirmedBy: null,
      confirmedAt: null,
      handovers: [],
      createdBy: "王工",
      createdAt: "2026-09-27T08:30:00",
    },
  ];
}

function seedResamples(): ResampleTask[] {
  return [
    {
      id: "RS-0001",
      sourceOrderId: "DY-0004",
      reason: "客户对色光源下偏红，ΔE 超客户允差 1.0，要求重打",
      status: "待重打",
      createdAt: "2026-09-23T14:10:00",
    },
  ];
}
