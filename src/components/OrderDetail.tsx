import { useState } from "react";
import type { SampleOrder } from "../types";
import { STATUS_LABEL } from "../types";
import type { ActionResult, StoreActions } from "../store";
import {
  WEIGH_TOLERANCE,
  fmtDev,
  fmtWeight,
  isOutOfTolerance,
  lineDeviation,
} from "../store";
import { Notice, Section, StatusBadge } from "./ui";

interface PanelProps {
  order: SampleOrder;
  actions: StoreActions;
  run: (r: ActionResult) => void;
}

/* ---------------- 配方称量 ---------------- */

function WeighingPanel({ order, actions, run }: PanelProps) {
  const editable = order.status === "weighing";
  const [operator, setOperator] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const unweighed = order.recipe.filter((l) => l.actualWeight === null).length;
  const outCount = order.recipe.filter((l) => {
    const d = lineDeviation(l);
    return d !== null && isOutOfTolerance(d);
  }).length;

  const hint =
    unweighed > 0
      ? `还有 ${unweighed} 项未称量`
      : outCount > 0
        ? `${outCount} 项超差（>±${WEIGH_TOLERANCE.toFixed(3)}g），已留痕，须重新称量`
        : "全部达标，可完成配料";

  return (
    <Section
      title="配方与逐项称量"
      extra={
        editable ? (
          <span className={`hint ${unweighed === 0 && outCount === 0 ? "good-text" : "warn-text"}`}>
            {hint}
          </span>
        ) : undefined
      }
    >
      {editable && (
        <div className="row">
          <label className="field inline">
            <span>称量人</span>
            <input
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="记录到每条称量"
            />
          </label>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>物料</th>
              <th>目标 (g)</th>
              <th>实称 (g)</th>
              <th>偏差 (g)</th>
              <th>判定</th>
              <th>称量人 / 时间</th>
              {editable && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {order.recipe.map((l) => {
              const dev = lineDeviation(l);
              const out = dev !== null && isOutOfTolerance(dev);
              return (
                <tr key={l.id}>
                  <td>{l.material}</td>
                  <td className="mono">{fmtWeight(l.targetWeight)}</td>
                  <td className="mono">
                    {editable ? (
                      <input
                        className="cell-input"
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        value={values[l.id] ?? (l.actualWeight !== null ? fmtWeight(l.actualWeight) : "")}
                        onChange={(e) => setValues((v) => ({ ...v, [l.id]: e.target.value }))}
                      />
                    ) : l.actualWeight !== null ? (
                      fmtWeight(l.actualWeight)
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`mono ${dev === null ? "" : out ? "dev-out" : "dev-ok"}`}>
                    {dev === null ? "—" : fmtDev(dev)}
                  </td>
                  <td>
                    {dev === null ? (
                      <span className="badge tag-none">未称量</span>
                    ) : out ? (
                      <span className="badge tag-out">超差留痕</span>
                    ) : (
                      <span className="badge tag-ok">达标</span>
                    )}
                  </td>
                  <td className="muted">
                    {l.weighedBy ? `${l.weighedBy} · ${l.weighedAt}` : "—"}
                  </td>
                  {editable && (
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          const raw = values[l.id];
                          const r = actions.weighLine(order.id, l.id, parseFloat(raw ?? ""), operator);
                          run(r);
                          if (r.ok) setValues((v) => ({ ...v, [l.id]: "" }));
                        }}
                      >
                        记录称量
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="row end">
          <button className="btn btn-primary" onClick={() => run(actions.completeWeighing(order.id))}>
            完成配料，进入打样
          </button>
        </div>
      )}

      {order.deviations.length > 0 && (
        <div className="log-block">
          <h4>称量偏差留痕（{order.deviations.length}）</h4>
          <ul className="log">
            {order.deviations.map((d) => (
              <li key={d.id} className="log-item">
                <b>{d.material}</b> 目标 {fmtWeight(d.targetWeight)}g / 实称{" "}
                {fmtWeight(d.actualWeight)}g，偏差{" "}
                <span className="dev-out">{fmtDev(d.deviation)}g</span>
                <span className="muted">
                  {" "}
                  — {d.operator} · {d.recordedAt}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ---------------- 质控 ---------------- */

interface HeatDraft {
  key: string;
  temperature: string;
  minutes: string;
}

function QcPanel({ order, actions, run }: PanelProps) {
  const [labL, setLabL] = useState("");
  const [labA, setLabA] = useState("");
  const [labB, setLabB] = useState("");
  const [inspector, setInspector] = useState("");
  const [heats, setHeats] = useState<HeatDraft[]>([
    { key: "h1", temperature: "", minutes: "" },
  ]);

  const qc = order.qc;
  const deltaE =
    qc && order.targetLab
      ? Math.sqrt(
          (qc.labL - order.targetLab.L) ** 2 +
            (qc.labA - order.targetLab.a) ** 2 +
            (qc.labB - order.targetLab.b) ** 2,
        )
      : null;

  return (
    <Section title="打样后质控（Lab 三轴 + 保温记录）">
      {qc ? (
        <>
          <div className="kv-grid">
            <div>
              <span>实测 L*</span>
              <b className="mono">{qc.labL.toFixed(1)}</b>
            </div>
            <div>
              <span>实测 a*</span>
              <b className="mono">{qc.labA.toFixed(1)}</b>
            </div>
            <div>
              <span>实测 b*</span>
              <b className="mono">{qc.labB.toFixed(1)}</b>
            </div>
            {order.targetLab && (
              <div>
                <span>目标 Lab</span>
                <b className="mono">
                  {order.targetLab.L.toFixed(1)} / {order.targetLab.a.toFixed(1)} /{" "}
                  {order.targetLab.b.toFixed(1)}
                </b>
              </div>
            )}
            {deltaE !== null && (
              <div>
                <span>色差 ΔE*ab</span>
                <b className={`mono ${deltaE <= 1 ? "dev-ok" : "dev-out"}`}>
                  {deltaE.toFixed(2)}
                </b>
              </div>
            )}
            <div>
              <span>检验员</span>
              <b>
                {qc.inspector} · {qc.submittedAt}
              </b>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>保温温度 (℃)</th>
                  <th>保温时长 (min)</th>
                </tr>
              </thead>
              <tbody>
                {qc.heatRecords.map((h, i) => (
                  <tr key={h.id}>
                    <td>{i + 1}</td>
                    <td className="mono">{h.temperature}</td>
                    <td className="mono">{h.minutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : order.status === "dyeing" ? (
        <>
          <div className="form-grid">
            <label className="field">
              <span>L*（明度）</span>
              <input type="number" step="0.1" value={labL} onChange={(e) => setLabL(e.target.value)} placeholder="如 48.2" />
            </label>
            <label className="field">
              <span>a*（红绿轴）</span>
              <input type="number" step="0.1" value={labA} onChange={(e) => setLabA(e.target.value)} placeholder="如 -30.5" />
            </label>
            <label className="field">
              <span>b*（黄蓝轴）</span>
              <input type="number" step="0.1" value={labB} onChange={(e) => setLabB(e.target.value)} placeholder="如 15.1" />
            </label>
            <label className="field">
              <span>检验员</span>
              <input value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="质控录入人" />
            </label>
          </div>

          <h4 className="subhead">保温记录</h4>
          {heats.map((h, i) => (
            <div className="row" key={h.key}>
              <label className="field inline">
                <span>温度 (℃)</span>
                <input
                  type="number"
                  step="1"
                  value={h.temperature}
                  onChange={(e) =>
                    setHeats((hs) => hs.map((x, j) => (j === i ? { ...x, temperature: e.target.value } : x)))
                  }
                  placeholder="如 98"
                />
              </label>
              <label className="field inline">
                <span>时长 (min)</span>
                <input
                  type="number"
                  step="1"
                  value={h.minutes}
                  onChange={(e) =>
                    setHeats((hs) => hs.map((x, j) => (j === i ? { ...x, minutes: e.target.value } : x)))
                  }
                  placeholder="如 30"
                />
              </label>
              {heats.length > 1 && (
                <button className="btn btn-sm" onClick={() => setHeats((hs) => hs.filter((_, j) => j !== i))}>
                  删除
                </button>
              )}
            </div>
          ))}
          <div className="row">
            <button
              className="btn btn-sm"
              onClick={() => setHeats((hs) => [...hs, { key: `h${Date.now()}`, temperature: "", minutes: "" }])}
            >
              + 添加保温段
            </button>
          </div>

          <div className="row end">
            <button
              className="btn btn-primary"
              onClick={() =>
                run(
                  actions.submitQc(order.id, {
                    labL: parseFloat(labL),
                    labA: parseFloat(labA),
                    labB: parseFloat(labB),
                    inspector,
                    heatRecords: heats.map((h) => ({
                      temperature: parseFloat(h.temperature),
                      minutes: parseFloat(h.minutes),
                    })),
                  }),
                )
              }
            >
              提交质控，进入待确认
            </button>
          </div>
        </>
      ) : (
        <p className="muted">完成配料并打样后，由质控录入 Lab 三轴读数与保温记录。</p>
      )}
    </Section>
  );
}

/* ---------------- 负责人确认 ---------------- */

function ConfirmPanel({ order, actions, run }: PanelProps) {
  const [confirmer, setConfirmer] = useState("");

  return (
    <Section title="负责人确认">
      {order.confirmedBy ? (
        <p className="good-text">
          已由 {order.confirmedBy} 确认（{order.confirmedAt}），样品可交接。
        </p>
      ) : order.status === "pending_confirm" ? (
        <>
          <p className="muted">质控结果待确认。确认前样品不得交给客户。</p>
          <div className="row">
            <label className="field inline">
              <span>负责人</span>
              <input
                value={confirmer}
                onChange={(e) => setConfirmer(e.target.value)}
                placeholder="确认负责人姓名"
              />
            </label>
            <button className="btn btn-primary" onClick={() => run(actions.confirmOrder(order.id, confirmer))}>
              确认放行
            </button>
          </div>
        </>
      ) : (
        <p className="muted">质控提交后进入待确认。</p>
      )}
    </Section>
  );
}

/* ---------------- 样品交接 ---------------- */

function HandoverPanel({ order, actions, run }: PanelProps) {
  const [receiver, setReceiver] = useState("");
  const [deliverOp, setDeliverOp] = useState("");
  const [returnOp, setReturnOp] = useState("");
  const [reason, setReason] = useState("");

  const canHandover = order.status === "confirmed" || order.status === "delivered";

  return (
    <Section title="样品交接（关联本打样单）">
      {!canHandover && (
        <div className="locked">
          🔒 当前状态「{STATUS_LABEL[order.status]}」：负责人确认前，禁止将样品交给客户。
        </div>
      )}

      {order.status === "confirmed" && (
        <div className="handover-grid">
          <div className="handover-card">
            <h4>样品领取（交客户）</h4>
            <label className="field">
              <span>领取人</span>
              <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="客户/跟单姓名" />
            </label>
            <label className="field">
              <span>经办人</span>
              <input value={deliverOp} onChange={(e) => setDeliverOp(e.target.value)} placeholder="实验台经办人" />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => run(actions.deliverOrder(order.id, receiver, deliverOp))}
            >
              登记领取
            </button>
          </div>

          <div className="handover-card">
            <h4>样品退库</h4>
            <label className="field">
              <span>经办人</span>
              <input value={returnOp} onChange={(e) => setReturnOp(e.target.value)} placeholder="实验台经办人" />
            </label>
            <label className="field">
              <span>退回原因（必填，将生成待重打记录）</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：色光偏红，需调整配方" rows={2} />
            </label>
            <button className="btn btn-danger" onClick={() => run(actions.returnOrder(order.id, returnOp, reason))}>
              登记退库
            </button>
          </div>
        </div>
      )}

      {order.status === "delivered" && (
        <div className="handover-card">
          <h4>客户退回 / 退库</h4>
          <label className="field">
            <span>经办人</span>
            <input value={returnOp} onChange={(e) => setReturnOp(e.target.value)} placeholder="实验台经办人" />
          </label>
          <label className="field">
            <span>退回原因（必填，将生成待重打记录）</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：客户复核色差偏大" rows={2} />
          </label>
          <button className="btn btn-danger" onClick={() => run(actions.returnOrder(order.id, returnOp, reason))}>
            登记退库
          </button>
        </div>
      )}

      {order.status === "returned" && (
        <p className="muted">样品已退库，系统已生成待重打记录，可在「待重打」页签生成重打单。</p>
      )}

      {order.handovers.length > 0 && (
        <div className="log-block">
          <h4>交接记录</h4>
          <ul className="log">
            {order.handovers.map((h) => (
              <li key={h.id} className={`log-item ${h.type === "returned" ? "warn" : ""}`}>
                <b>{h.type === "delivered" ? "领取" : "退库"}</b>
                {h.receiver ? ` · 领取人 ${h.receiver}` : ""} · 经办 {h.operator}
                {h.reason ? ` · 原因：${h.reason}` : ""}
                <span className="muted"> · {h.at}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/* ---------------- 时间线 ---------------- */

function Timeline({ order }: { order: SampleOrder }) {
  const events: { time: string; text: string }[] = [
    { time: order.createdAt, text: `创建打样单（${order.createdBy}）` },
  ];
  if (order.weighingCompletedAt) events.push({ time: order.weighingCompletedAt, text: "完成配料，进入打样" });
  if (order.qc) events.push({ time: order.qc.submittedAt, text: `质控提交（${order.qc.inspector}），进入待确认` });
  if (order.confirmedAt) events.push({ time: order.confirmedAt, text: `负责人 ${order.confirmedBy} 确认放行` });
  for (const h of order.handovers) {
    events.push({
      time: h.at,
      text: h.type === "delivered" ? `样品领取：${h.receiver}` : `样品退库：${h.reason}`,
    });
  }

  return (
    <Section title="流程时间线">
      <ul className="timeline">
        {events.map((e, i) => (
          <li key={i}>
            <span className="dot" />
            <div>
              <b>{e.text}</b>
              <p className="muted">{e.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---------------- 详情主面板 ---------------- */

export function OrderDetail({ order, actions }: { order: SampleOrder; actions: StoreActions }) {
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const run = (r: ActionResult) => setNotice({ kind: r.ok ? "ok" : "err", text: r.message || "操作成功" });

  return (
    <div className="detail">
      <Section title={`打样单 ${order.id}`} extra={<StatusBadge status={order.status} />}>
        <div className="kv-grid">
          <div>
            <span>客户订单</span>
            <b>{order.orderNo}</b>
          </div>
          <div>
            <span>布种</span>
            <b>{order.fabric}</b>
          </div>
          <div>
            <span>目标色号</span>
            <b className="mono">{order.colorNo}</b>
          </div>
          <div>
            <span>目标 Lab</span>
            <b className="mono">
              {order.targetLab
                ? `${order.targetLab.L.toFixed(1)} / ${order.targetLab.a.toFixed(1)} / ${order.targetLab.b.toFixed(1)}`
                : "未录入"}
            </b>
          </div>
          <div>
            <span>创建</span>
            <b>
              {order.createdBy} · {order.createdAt}
            </b>
          </div>
          {order.reworkFromId && (
            <div>
              <span>重打来源</span>
              <b className="mono">{order.reworkFromId}</b>
            </div>
          )}
        </div>
        <Notice notice={notice} />
      </Section>

      <WeighingPanel order={order} actions={actions} run={run} />
      <QcPanel order={order} actions={actions} run={run} />
      <ConfirmPanel order={order} actions={actions} run={run} />
      <HandoverPanel order={order} actions={actions} run={run} />
      <Timeline order={order} />
    </div>
  );
}
