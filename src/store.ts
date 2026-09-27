import { useEffect, useState } from "react";
import type {
  DeviationLog,
  HandoverLog,
  QcRecord,
  RecipeLine,
  ReworkRecord,
  SampleOrder,
} from "./types";

/** 称量允差：偏差超过 0.01g 即留痕并阻止完成配料 */
export const WEIGH_TOLERANCE = 0.01;

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

const OK: ActionResult = { ok: true, message: "" };
const fail = (message: string): ActionResult => ({ ok: false, message });

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function now(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function lineDeviation(line: RecipeLine): number | null {
  if (line.actualWeight === null) return null;
  return round3(line.actualWeight - line.targetWeight);
}

/** 严格超过 ±0.01g 才算超差（0.01g 本身允许） */
export function isOutOfTolerance(deviation: number): boolean {
  return Math.round(Math.abs(deviation) * 1000) > Math.round(WEIGH_TOLERANCE * 1000);
}

export function fmtWeight(n: number): string {
  return n.toFixed(3);
}

export function fmtDev(n: number): string {
  return (n > 0 ? "+" : "") + n.toFixed(3);
}

export interface NewOrderInput {
  orderNo: string;
  fabric: string;
  colorNo: string;
  targetLab: { L: number; a: number; b: number } | null;
  recipe: { material: string; targetWeight: number }[];
  createdBy: string;
  reworkFromId?: string;
}

export interface QcInput {
  labL: number;
  labA: number;
  labB: number;
  inspector: string;
  heatRecords: { temperature: number; minutes: number }[];
}

export interface StoreState {
  orders: SampleOrder[];
  reworks: ReworkRecord[];
}

export interface StoreActions {
  createOrder(input: NewOrderInput): ActionResult;
  weighLine(orderId: string, lineId: string, actualWeight: number, operator: string): ActionResult;
  completeWeighing(orderId: string): ActionResult;
  submitQc(orderId: string, input: QcInput): ActionResult;
  confirmOrder(orderId: string, confirmer: string): ActionResult;
  deliverOrder(orderId: string, receiver: string, operator: string): ActionResult;
  returnOrder(orderId: string, operator: string, reason: string): ActionResult;
  createReworkOrder(reworkId: string): ActionResult;
  reset(): void;
}

function nextId(existing: string[], prefix: string): string {
  const max = existing.reduce((m, id) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(id);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function line(
  id: string,
  material: string,
  targetWeight: number,
  actualWeight: number | null = null,
  weighedBy: string | null = null,
  weighedAt: string | null = null,
): RecipeLine {
  return { id, material, targetWeight, actualWeight, weighedBy, weighedAt };
}

function buildSeed(): StoreState {
  const orders: SampleOrder[] = [
    {
      id: "DY-0001",
      orderNo: "SO-2026-0412",
      fabric: "棉府绸 120g/m²",
      colorNo: "RD-305",
      targetLab: { L: 52.3, a: 48.1, b: 12.6 },
      recipe: [
        line("L1", "活性红 3BS", 0.85, 0.847, "王小染", "2026/9/26 09:42:10"),
        line("L2", "活性黄 3RS", 0.32, 0.334, "王小染", "2026/9/26 09:43:02"),
        line("L3", "元明粉", 12.0),
        line("L4", "纯碱", 6.0),
      ],
      deviations: [
        {
          id: "DV-1",
          lineId: "L2",
          material: "活性黄 3RS",
          targetWeight: 0.32,
          actualWeight: 0.334,
          deviation: 0.014,
          operator: "王小染",
          recordedAt: "2026/9/26 09:43:02",
        },
      ],
      status: "weighing",
      createdBy: "王小染",
      createdAt: "2026/9/26 09:30:00",
      weighingCompletedAt: null,
      qc: null,
      confirmedBy: null,
      confirmedAt: null,
      handovers: [],
    },
    {
      id: "DY-0002",
      orderNo: "SO-2026-0418",
      fabric: "涤纶针织 180g/m²",
      colorNo: "BL-118",
      targetLab: { L: 38.6, a: -4.2, b: -32.8 },
      recipe: [
        line("L1", "分散蓝 2BLN", 0.64, 0.641, "赵配液", "2026/9/25 14:58:11"),
        line("L2", "分散红 3B", 0.12, 0.12, "赵配液", "2026/9/25 14:59:02"),
        line("L3", "匀染剂", 1.0, 0.999, "赵配液", "2026/9/25 15:00:26"),
        line("L4", "醋酸", 0.5, 0.5, "赵配液", "2026/9/25 15:02:40"),
      ],
      deviations: [],
      status: "dyeing",
      createdBy: "赵配液",
      createdAt: "2026/9/25 14:20:11",
      weighingCompletedAt: "2026/9/25 15:02:40",
      qc: null,
      confirmedBy: null,
      confirmedAt: null,
      handovers: [],
    },
    {
      id: "DY-0003",
      orderNo: "SO-2026-0409",
      fabric: "混纺斜纹 220g/m²",
      colorNo: "GN-072",
      targetLab: { L: 48.0, a: -30.0, b: 15.0 },
      recipe: [
        line("L1", "活性蓝 BRF", 0.52, 0.521, "王小染", "2026/9/25 10:32:14"),
        line("L2", "活性黄 3RS", 0.28, 0.28, "王小染", "2026/9/25 10:33:40"),
        line("L3", "元明粉", 10.0, 10.005, "王小染", "2026/9/25 10:36:02"),
        line("L4", "纯碱", 5.0, 5.0, "王小染", "2026/9/25 10:40:00"),
      ],
      deviations: [],
      status: "pending_confirm",
      createdBy: "王小染",
      createdAt: "2026/9/25 10:05:00",
      weighingCompletedAt: "2026/9/25 10:40:00",
      qc: {
        labL: 48.2,
        labA: -30.5,
        labB: 15.1,
        heatRecords: [
          { id: "H1", temperature: 60, minutes: 10 },
          { id: "H2", temperature: 98, minutes: 30 },
        ],
        inspector: "李质检",
        submittedAt: "2026/9/26 16:20:33",
      },
      confirmedBy: null,
      confirmedAt: null,
      handovers: [],
    },
    {
      id: "DY-0004",
      orderNo: "SO-2026-0395",
      fabric: "锦纶塔夫绸 90g/m²",
      colorNo: "BK-901",
      targetLab: { L: 16.5, a: 0.8, b: -1.2 },
      recipe: [
        line("L1", "酸性黑 ATT", 0.95, 0.948, "赵配液", "2026/9/24 11:02:19"),
        line("L2", "匀染剂", 0.8, 0.8, "赵配液", "2026/9/24 11:04:51"),
      ],
      deviations: [],
      status: "confirmed",
      createdBy: "赵配液",
      createdAt: "2026/9/24 10:30:00",
      weighingCompletedAt: "2026/9/24 11:04:51",
      qc: {
        labL: 16.4,
        labA: 0.9,
        labB: -1.0,
        heatRecords: [
          { id: "H1", temperature: 40, minutes: 10 },
          { id: "H2", temperature: 95, minutes: 40 },
        ],
        inspector: "李质检",
        submittedAt: "2026/9/25 09:12:00",
      },
      confirmedBy: "张主管",
      confirmedAt: "2026/9/26 11:15:00",
      handovers: [],
    },
    {
      id: "DY-0005",
      orderNo: "SO-2026-0388",
      fabric: "棉府绸 120g/m²",
      colorNo: "YL-220",
      targetLab: { L: 78.2, a: 8.4, b: 62.5 },
      recipe: [
        line("L1", "活性黄 3RS", 0.66, 0.662, "王小染", "2026/9/23 09:12:44"),
        line("L2", "元明粉", 12.0, 12.0, "王小染", "2026/9/23 09:15:03"),
        line("L3", "纯碱", 6.0, 5.997, "王小染", "2026/9/23 09:17:30"),
      ],
      deviations: [],
      status: "returned",
      createdBy: "王小染",
      createdAt: "2026/9/23 08:50:00",
      weighingCompletedAt: "2026/9/23 09:17:30",
      qc: {
        labL: 78.0,
        labA: 9.8,
        labB: 61.9,
        heatRecords: [{ id: "H1", temperature: 60, minutes: 30 }],
        inspector: "李质检",
        submittedAt: "2026/9/24 10:02:11",
      },
      confirmedBy: "张主管",
      confirmedAt: "2026/9/24 15:40:00",
      handovers: [
        {
          id: "HO-1",
          type: "returned",
          operator: "王小染",
          reason: "客户反馈色光偏红，要求调整配方重打",
          at: "2026/9/26 14:05:00",
        },
      ],
    },
    {
      id: "DY-0006",
      orderNo: "SO-2026-0371",
      fabric: "粘胶人棉 140g/m²",
      colorNo: "PK-106",
      targetLab: { L: 62.4, a: 36.2, b: 4.8 },
      recipe: [
        line("L1", "活性红 3BS", 0.72, 0.719, "赵配液", "2026/9/22 13:40:00"),
        line("L2", "元明粉", 10.0, 10.0, "赵配液", "2026/9/22 13:44:00"),
      ],
      deviations: [],
      status: "delivered",
      createdBy: "赵配液",
      createdAt: "2026/9/22 13:20:00",
      weighingCompletedAt: "2026/9/22 13:44:00",
      qc: {
        labL: 62.5,
        labA: 36.0,
        labB: 4.9,
        heatRecords: [{ id: "H1", temperature: 60, minutes: 30 }],
        inspector: "李质检",
        submittedAt: "2026/9/23 11:00:00",
      },
      confirmedBy: "张主管",
      confirmedAt: "2026/9/23 16:20:00",
      handovers: [
        {
          id: "HO-2",
          type: "delivered",
          operator: "王小染",
          receiver: "陈工（客户代表）",
          at: "2026/9/24 17:30:00",
        },
      ],
    },
  ];

  const reworks: ReworkRecord[] = [
    {
      id: "RW-0001",
      sourceOrderId: "DY-0005",
      orderNo: "SO-2026-0388",
      fabric: "棉府绸 120g/m²",
      colorNo: "YL-220",
      reason: "客户反馈色光偏红，要求调整配方重打",
      status: "pending",
      createdAt: "2026/9/26 14:05:00",
      newOrderId: null,
    },
  ];

  return { orders, reworks };
}

const STORAGE_KEY = "dye-lab-store-v1";

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (Array.isArray(parsed.orders) && Array.isArray(parsed.reworks)) return parsed;
    }
  } catch {
    // 数据损坏时回退到演示数据
  }
  return buildSeed();
}

export function useLabStore(): StoreState & { actions: StoreActions } {
  const [state, setState] = useState<StoreState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateOrder = (orderId: string, fn: (o: SampleOrder) => SampleOrder) =>
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === orderId ? fn(o) : o)),
    }));

  const actions: StoreActions = {
    createOrder(input) {
      const orderNo = input.orderNo.trim();
      const fabric = input.fabric.trim();
      const colorNo = input.colorNo.trim();
      const createdBy = input.createdBy.trim();
      if (!orderNo || !fabric || !colorNo) return fail("客户订单、布种、目标色号为必填项");
      if (!createdBy) return fail("请填写创建人");
      const recipe = input.recipe.filter((r) => r.material.trim() || r.targetWeight > 0);
      if (recipe.length === 0) return fail("配方至少需要一行染料/助剂");
      for (const r of recipe) {
        if (!r.material.trim()) return fail("配方中存在未填写物料名称的行");
        if (!Number.isFinite(r.targetWeight) || r.targetWeight <= 0)
          return fail(`「${r.material}」的目标重量须大于 0`);
      }
      const id = nextId(state.orders.map((o) => o.id), "DY");
      const order: SampleOrder = {
        id,
        orderNo,
        fabric,
        colorNo,
        targetLab: input.targetLab,
        recipe: recipe.map((r, i) =>
          line(`L${i + 1}`, r.material.trim(), round3(r.targetWeight)),
        ),
        deviations: [],
        status: "weighing",
        createdBy,
        createdAt: now(),
        weighingCompletedAt: null,
        qc: null,
        confirmedBy: null,
        confirmedAt: null,
        handovers: [],
        reworkFromId: input.reworkFromId,
      };
      setState((s) => ({ ...s, orders: [...s.orders, order] }));
      return { ok: true, message: `打样单 ${id} 已创建`, id };
    },

    weighLine(orderId, lineId, actualWeight, operator) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return fail("打样单不存在");
      if (order.status !== "weighing") return fail("当前状态不可称量");
      const op = operator.trim();
      if (!op) return fail("请先填写称量人");
      if (!Number.isFinite(actualWeight) || actualWeight < 0)
        return fail("请输入有效的实称重量");
      const target = order.recipe.find((l) => l.id === lineId);
      if (!target) return fail("配方行不存在");

      const actual = round3(actualWeight);
      const deviation = round3(actual - target.targetWeight);
      const out = isOutOfTolerance(deviation);
      const at = now();

      updateOrder(orderId, (o) => {
        const deviations: DeviationLog[] = out
          ? [
              ...o.deviations,
              {
                id: uid("DV"),
                lineId,
                material: target.material,
                targetWeight: target.targetWeight,
                actualWeight: actual,
                deviation,
                operator: op,
                recordedAt: at,
              },
            ]
          : o.deviations;
        return {
          ...o,
          deviations,
          recipe: o.recipe.map((l) =>
            l.id === lineId
              ? { ...l, actualWeight: actual, weighedBy: op, weighedAt: at }
              : l,
          ),
        };
      });

      return out
        ? {
            ok: true,
            message: `偏差 ${fmtDev(deviation)}g 超过 ±0.010g，已留痕；须重新称量至允差内`,
          }
        : OK;
    },

    completeWeighing(orderId) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return fail("打样单不存在");
      if (order.status !== "weighing") return fail("当前状态不可完成配料");
      const unweighed = order.recipe.filter((l) => l.actualWeight === null).length;
      if (unweighed > 0) return fail(`还有 ${unweighed} 项未称量，不能完成配料`);
      const outCount = order.recipe.filter((l) => {
        const d = lineDeviation(l);
        return d !== null && isOutOfTolerance(d);
      }).length;
      if (outCount > 0)
        return fail(`存在 ${outCount} 项超差称量（已留痕），须重新称量至 ±0.010g 内才能完成`);
      updateOrder(orderId, (o) => ({
        ...o,
        status: "dyeing",
        weighingCompletedAt: now(),
      }));
      return { ok: true, message: "配料完成，进入打样与质控" };
    },

    submitQc(orderId, input) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return fail("打样单不存在");
      if (order.status !== "dyeing") return fail("当前状态不可提交质控");
      const inspector = input.inspector.trim();
      if (!inspector) return fail("请填写检验员");
      const { labL, labA, labB } = input;
      if (![labL, labA, labB].every(Number.isFinite)) return fail("请完整录入 Lab 三轴读数");
      const heats = input.heatRecords.filter(
        (h) => Number.isFinite(h.temperature) && Number.isFinite(h.minutes),
      );
      if (heats.length === 0) return fail("请至少录入一条保温记录");
      for (const h of heats) {
        if (h.temperature <= 0 || h.minutes <= 0) return fail("保温温度与时长须大于 0");
      }
      const qc: QcRecord = {
        labL: round3(labL),
        labA: round3(labA),
        labB: round3(labB),
        heatRecords: heats.map((h, i) => ({ id: `H${i + 1}`, ...h })),
        inspector,
        submittedAt: now(),
      };
      updateOrder(orderId, (o) => ({ ...o, qc, status: "pending_confirm" }));
      return { ok: true, message: "质控已提交，结果进入待确认" };
    },

    confirmOrder(orderId, confirmer) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return fail("打样单不存在");
      if (order.status !== "pending_confirm") return fail("仅待确认状态可执行确认");
      const name = confirmer.trim();
      if (!name) return fail("请填写确认负责人");
      updateOrder(orderId, (o) => ({
        ...o,
        status: "confirmed",
        confirmedBy: name,
        confirmedAt: now(),
      }));
      return { ok: true, message: "负责人已确认，样品可交接" };
    },

    deliverOrder(orderId, receiver, operator) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return fail("打样单不存在");
      // 硬性规则：负责人确认前不能把样品交给客户
      if (order.status !== "confirmed") return fail("负责人确认前，不能把样品交给客户");
      const recv = receiver.trim();
      const op = operator.trim();
      if (!recv) return fail("请填写领取人");
      if (!op) return fail("请填写经办人");
      const log: HandoverLog = {
        id: uid("HO"),
        type: "delivered",
        receiver: recv,
        operator: op,
        at: now(),
      };
      updateOrder(orderId, (o) => ({
        ...o,
        status: "delivered",
        handovers: [...o.handovers, log],
      }));
      return { ok: true, message: `样品已交接给 ${recv}` };
    },

    returnOrder(orderId, operator, reason) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return fail("打样单不存在");
      if (order.status !== "confirmed" && order.status !== "delivered")
        return fail("仅已确认/已领取的样品可办理退库");
      const op = operator.trim();
      const rs = reason.trim();
      if (!op) return fail("请填写经办人");
      if (!rs) return fail("退库必须填写退回原因");
      const log: HandoverLog = {
        id: uid("HO"),
        type: "returned",
        operator: op,
        reason: rs,
        at: now(),
      };
      const reworkId = nextId(state.reworks.map((r) => r.id), "RW");
      const rework: ReworkRecord = {
        id: reworkId,
        sourceOrderId: order.id,
        orderNo: order.orderNo,
        fabric: order.fabric,
        colorNo: order.colorNo,
        reason: rs,
        status: "pending",
        createdAt: now(),
        newOrderId: null,
      };
      setState((s) => ({
        orders: s.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: "returned", handovers: [...o.handovers, log] }
            : o,
        ),
        reworks: [...s.reworks, rework],
      }));
      return { ok: true, message: `已退库，并生成待重打记录 ${reworkId}` };
    },

    createReworkOrder(reworkId) {
      const rework = state.reworks.find((r) => r.id === reworkId);
      if (!rework) return fail("待重打记录不存在");
      if (rework.status !== "pending") return fail("该记录已生成重打单");
      const source = state.orders.find((o) => o.id === rework.sourceOrderId);
      if (!source) return fail("原打样单不存在");
      const id = nextId(state.orders.map((o) => o.id), "DY");
      const order: SampleOrder = {
        id,
        orderNo: source.orderNo,
        fabric: source.fabric,
        colorNo: source.colorNo,
        targetLab: source.targetLab,
        recipe: source.recipe.map((l, i) => line(`L${i + 1}`, l.material, l.targetWeight)),
        deviations: [],
        status: "weighing",
        createdBy: source.createdBy,
        createdAt: now(),
        weighingCompletedAt: null,
        qc: null,
        confirmedBy: null,
        confirmedAt: null,
        handovers: [],
        reworkFromId: source.id,
      };
      setState((s) => ({
        orders: [...s.orders, order],
        reworks: s.reworks.map((r) =>
          r.id === reworkId ? { ...r, status: "done", newOrderId: id } : r,
        ),
      }));
      return { ok: true, message: `已按原配方生成重打单 ${id}`, id };
    },

    reset() {
      setState(buildSeed());
    },
  };

  return { ...state, actions };
}
