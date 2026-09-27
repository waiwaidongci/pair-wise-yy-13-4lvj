import { useEffect, useState } from "react";
import { RecipeItem, SampleOrder } from "../types";
import { genId } from "../store";

interface Props {
  prefill: SampleOrder | null; // 由待重打任务带入
  onSubmit: (order: Omit<SampleOrder, "id">) => void;
  onCancel: () => void;
}

interface RecipeRow {
  name: string;
  weight: string;
}

const FABRIC_SUGGESTIONS = ["棉府绸", "涤纶针织", "锦纶塔夫绸", "T/C 混纺斜纹", "人棉贡缎", "全棉卡其"];

export default function NewOrderForm({ prefill, onSubmit, onCancel }: Props) {
  const [orderNo, setOrderNo] = useState("");
  const [fabric, setFabric] = useState("");
  const [colorNo, setColorNo] = useState("");
  const [liquorRatio, setLiquorRatio] = useState("");
  const [labL, setLabL] = useState("");
  const [labA, setLabA] = useState("");
  const [labB, setLabB] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [rows, setRows] = useState<RecipeRow[]>([{ name: "", weight: "" }]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!prefill) return;
    setOrderNo(prefill.orderNo);
    setFabric(prefill.fabric);
    setColorNo(prefill.colorNo);
    setLiquorRatio(prefill.liquorRatio);
    setLabL(prefill.targetLab ? String(prefill.targetLab.L) : "");
    setLabA(prefill.targetLab ? String(prefill.targetLab.a) : "");
    setLabB(prefill.targetLab ? String(prefill.targetLab.b) : "");
    setRows(
      prefill.recipe.map((r) => ({ name: r.name, weight: String(r.targetWeight) }))
    );
  }, [prefill]);

  const setRow = (i: number, patch: Partial<RecipeRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = () => {
    if (!orderNo.trim()) return setError("请填写客户订单号");
    if (!fabric.trim()) return setError("请填写布种");
    if (!colorNo.trim()) return setError("请填写目标色号");
    if (!createdBy.trim()) return setError("请填写创建人");

    const recipe: RecipeItem[] = [];
    for (const [i, row] of rows.entries()) {
      if (!row.name.trim() && !row.weight.trim()) continue;
      const w = parseFloat(row.weight);
      if (!row.name.trim()) return setError(`配方第 ${i + 1} 行缺少名称`);
      if (isNaN(w) || w <= 0) return setError(`配方第 ${i + 1} 行目标重量无效`);
      recipe.push({ id: genId("r"), name: row.name.trim(), targetWeight: w });
    }
    if (recipe.length === 0) return setError("至少需要一项配方");

    const L = parseFloat(labL);
    const a = parseFloat(labA);
    const b = parseFloat(labB);
    const hasLab = labL !== "" || labA !== "" || labB !== "";
    if (hasLab && (isNaN(L) || isNaN(a) || isNaN(b)))
      return setError("目标 Lab 需三项都填数字，或全部留空");

    setError("");
    onSubmit({
      orderNo: orderNo.trim(),
      fabric: fabric.trim(),
      colorNo: colorNo.trim(),
      liquorRatio: liquorRatio.trim(),
      targetLab: hasLab ? { L, a, b } : null,
      recipe,
      status: "待配料",
      weighRecords: [],
      qc: null,
      confirmedBy: null,
      confirmedAt: null,
      handovers: [],
      createdBy: createdBy.trim(),
      createdAt: new Date().toISOString(),
      sourceOrderId: prefill?.id,
    });
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>新建打样单</p>
          <h2>录入订单 · 布种 · 色号 · 配方</h2>
        </div>
        <button onClick={onCancel}>返回列表</button>
      </div>

      {prefill && (
        <div className="notice">
          本单由退库重打任务生成，已带入原单 <b className="mono">{prefill.id}</b>（
          {prefill.colorNo}）的资料，保存后两单自动关联。
        </div>
      )}

      <div className="field-grid">
        <label>
          <span>客户订单号 *</span>
          <input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="如 SO-2026-0205" />
        </label>
        <label>
          <span>布种 *</span>
          <input
            value={fabric}
            onChange={(e) => setFabric(e.target.value)}
            placeholder="如 棉府绸 40s"
            list="fabric-list"
          />
          <datalist id="fabric-list">
            {FABRIC_SUGGESTIONS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <label>
          <span>目标色号 *</span>
          <input value={colorNo} onChange={(e) => setColorNo(e.target.value)} placeholder="如 C-5021 藏青" />
        </label>
        <label>
          <span>浴比</span>
          <input value={liquorRatio} onChange={(e) => setLiquorRatio(e.target.value)} placeholder="如 1:20" />
        </label>
        <label>
          <span>目标 L*</span>
          <input type="number" step="0.01" value={labL} onChange={(e) => setLabL(e.target.value)} placeholder="选填" />
        </label>
        <label>
          <span>目标 a*</span>
          <input type="number" step="0.01" value={labA} onChange={(e) => setLabA(e.target.value)} placeholder="选填" />
        </label>
        <label>
          <span>目标 b*</span>
          <input type="number" step="0.01" value={labB} onChange={(e) => setLabB(e.target.value)} placeholder="选填" />
        </label>
        <label>
          <span>创建人 *</span>
          <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} placeholder="姓名" />
        </label>
      </div>

      <h3 className="section-title">配方明细（逐项称量，允差 ±0.01g）</h3>
      <div className="recipe-rows">
        {rows.map((row, i) => (
          <div className="recipe-row" key={i}>
            <input
              value={row.name}
              onChange={(e) => setRow(i, { name: e.target.value })}
              placeholder={`染料 / 助剂名称 ${i + 1}`}
            />
            <input
              type="number"
              step="0.001"
              min="0"
              value={row.weight}
              onChange={(e) => setRow(i, { weight: e.target.value })}
              placeholder="目标重量 g"
            />
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={rows.length === 1}
              title="删除该行"
            >
              删除
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows((p) => [...p, { name: "", weight: "" }])}>
        + 添加配方项
      </button>

      {error && <div className="error">{error}</div>}

      <div className="actions">
        <button className="primary" onClick={submit}>
          保存打样单（进入待配料）
        </button>
      </div>
    </section>
  );
}
