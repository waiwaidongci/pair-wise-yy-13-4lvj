import { useState } from "react";
import type { StoreActions } from "../store";
import { Notice, Section } from "./ui";

interface LineDraft {
  key: string;
  material: string;
  targetWeight: string;
}

const FABRICS = ["棉府绸 120g/m²", "涤纶针织 180g/m²", "锦纶塔夫绸 90g/m²", "混纺斜纹 220g/m²", "粘胶人棉 140g/m²"];
const MATERIALS = [
  "活性红 3BS",
  "活性黄 3RS",
  "活性蓝 BRF",
  "分散红 3B",
  "分散蓝 2BLN",
  "酸性黑 ATT",
  "元明粉",
  "纯碱",
  "匀染剂",
  "醋酸",
  "柔软剂",
];

interface Props {
  actions: StoreActions;
  onCreated: (orderId: string) => void;
}

export function NewOrderForm({ actions, onCreated }: Props) {
  const [orderNo, setOrderNo] = useState("");
  const [fabric, setFabric] = useState("");
  const [colorNo, setColorNo] = useState("");
  const [labL, setLabL] = useState("");
  const [labA, setLabA] = useState("");
  const [labB, setLabB] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { key: "r1", material: "", targetWeight: "" },
    { key: "r2", material: "", targetWeight: "" },
    { key: "r3", material: "", targetWeight: "" },
  ]);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = () => {
    const labFilled = [labL, labA, labB].filter((v) => v.trim() !== "").length;
    if (labFilled > 0 && labFilled < 3) {
      setNotice({ kind: "err", text: "目标 Lab 需三项同时填写，或全部留空" });
      return;
    }
    const targetLab =
      labFilled === 3
        ? { L: parseFloat(labL), a: parseFloat(labA), b: parseFloat(labB) }
        : null;
    if (targetLab && ![targetLab.L, targetLab.a, targetLab.b].every(Number.isFinite)) {
      setNotice({ kind: "err", text: "目标 Lab 读数无效" });
      return;
    }
    const r = actions.createOrder({
      orderNo,
      fabric,
      colorNo,
      targetLab,
      createdBy,
      recipe: lines.map((l) => ({
        material: l.material,
        targetWeight: parseFloat(l.targetWeight),
      })),
    });
    if (r.ok && r.id) {
      onCreated(r.id);
    } else {
      setNotice({ kind: "err", text: r.message });
    }
  };

  return (
    <Section title="新建打样单" extra={<span className="hint">创建后进入「配料中」，逐项称量</span>}>
      <datalist id="fabric-list">
        {FABRICS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <datalist id="material-list">
        {MATERIALS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className="form-grid">
        <label className="field">
          <span>客户订单号 *</span>
          <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="如 SO-2026-0420" />
        </label>
        <label className="field">
          <span>布种 *</span>
          <input list="fabric-list" value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="选择或输入布种" />
        </label>
        <label className="field">
          <span>目标色号 *</span>
          <input value={colorNo} onChange={(e) => setColorNo(e.target.value)} placeholder="如 RD-305" />
        </label>
        <label className="field">
          <span>创建人 *</span>
          <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} placeholder="实验台操作员" />
        </label>
        <label className="field">
          <span>目标 L*（可选）</span>
          <input type="number" step="0.1" value={labL} onChange={(e) => setLabL(e.target.value)} placeholder="用于 ΔE 对比" />
        </label>
        <label className="field">
          <span>目标 a*（可选）</span>
          <input type="number" step="0.1" value={labA} onChange={(e) => setLabA(e.target.value)} />
        </label>
        <label className="field">
          <span>目标 b*（可选）</span>
          <input type="number" step="0.1" value={labB} onChange={(e) => setLabB(e.target.value)} />
        </label>
      </div>

      <h4 className="subhead">染料配方（目标重量 g）</h4>
      {lines.map((l, i) => (
        <div className="row" key={l.key}>
          <label className="field inline grow">
            <span>物料 {i + 1}</span>
            <input
              list="material-list"
              value={l.material}
              onChange={(e) => setLine(i, { material: e.target.value })}
              placeholder="染料 / 助剂名称"
            />
          </label>
          <label className="field inline">
            <span>目标重量 (g)</span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={l.targetWeight}
              onChange={(e) => setLine(i, { targetWeight: e.target.value })}
              placeholder="0.000"
            />
          </label>
          {lines.length > 1 && (
            <button className="btn btn-sm" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
              删除
            </button>
          )}
        </div>
      ))}
      <div className="row">
        <button
          className="btn btn-sm"
          onClick={() => setLines((ls) => [...ls, { key: `r${Date.now()}`, material: "", targetWeight: "" }])}
        >
          + 添加配方行
        </button>
      </div>

      <Notice notice={notice} />

      <div className="row end">
        <button className="btn btn-primary" onClick={submit}>
          创建打样单
        </button>
      </div>
    </Section>
  );
}
