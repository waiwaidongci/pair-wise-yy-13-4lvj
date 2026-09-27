import { useMemo, useState } from "react";
import {
  HandoverRecord,
  HoldingRecord,
  QcRecord,
  SampleOrder,
  WeighRecord,
} from "../types";
import {
  STATUS_CLASS,
  TOLERANCE,
  calcDeltaE,
  fmtDev,
  fmtTime,
  genId,
  latestWeighMap,
  weighingBlockers,
} from "../store";

interface Props {
  order: SampleOrder;
  onUpdate: (o: SampleOrder) => void;
  onAddResample: (reason: string, source: SampleOrder) => void;
  onBack: () => void;
}

const canWeigh = (s: SampleOrder["status"]) => s === "待配料" || s === "配料中";

export default function OrderDetail({ order, onUpdate, onAddResample, onBack }: Props) {
  // 称量输入
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [weighOp, setWeighOp] = useState("");
  // 质控输入
  const [labL, setLabL] = useState("");
  const [labA, setLabA] = useState("");
  const [labB, setLabB] = useState("");
  const [holdings, setHoldings] = useState<{ temp: string; minutes: string }[]>([
    { temp: "", minutes: "" },
  ]);
  const [qcRemark, setQcRemark] = useState("");
  const [qcOp, setQcOp] = useState("");
  const [qcError, setQcError] = useState("");
  // 确认
  const [confirmer, setConfirmer] = useState("");
  // 交接
  const [pickupPerson, setPickupPerson] = useState("");
  const [returnPerson, setReturnPerson] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [handoverError, setHandoverError] = useState("");

  const latest = useMemo(() => latestWeighMap(order), [order]);
  const blockers = useMemo(() => weighingBlockers(order), [order]);

  const recordWeigh = (itemId: string) => {
    const item = order.recipe.find((r) => r.id === itemId);
    if (!item) return;
    const actual = parseFloat(weights[itemId] ?? "");
    if (isNaN(actual) || actual < 0) return alert("请输入有效的实称重量");
    if (!weighOp.trim()) return alert("请填写称量人");
    const deviation = Number((actual - item.targetWeight).toFixed(4));
    const rec: WeighRecord = {
      id: genId("w"),
      itemId,
      actualWeight: actual,
      deviation,
      overTolerance: Math.abs(deviation) > TOLERANCE + 1e-9,
      operator: weighOp.trim(),
      time: new Date().toISOString(),
    };
    const next: SampleOrder = {
      ...order,
      weighRecords: [...order.weighRecords, rec],
      status: order.status === "待配料" ? "配料中" : order.status,
    };
    onUpdate(next);
    setWeights((w) => ({ ...w, [itemId]: "" }));
  };

  const finishWeighing = () => {
    if (blockers.length > 0) return;
    onUpdate({ ...order, status: "待打样" });
  };

  const finishSampling = () => onUpdate({ ...order, status: "待质控" });

  const submitQc = () => {
    const L = parseFloat(labL);
    const a = parseFloat(labA);
    const b = parseFloat(labB);
    if (isNaN(L) || isNaN(a) || isNaN(b)) return setQcError("请完整录入 Lab 三轴读数");
    const validHoldings: HoldingRecord[] = [];
    for (const [i, h] of holdings.entries()) {
      if (!h.temp.trim() && !h.minutes.trim()) continue;
      const temp = parseFloat(h.temp);
      const minutes = parseFloat(h.minutes);
      if (isNaN(temp) || isNaN(minutes) || minutes <= 0)
        return setQcError(`保温记录第 ${i + 1} 行温度 / 时长无效`);
      validHoldings.push({ id: genId("h"), temp, minutes });
    }
    if (validHoldings.length === 0) return setQcError("至少录入一条保温记录");
    if (!qcOp.trim()) return setQcError("请填写质控操作人");

    const qc: QcRecord = {
      lab: { L, a, b },
      deltaE: order.targetLab
        ? Number(calcDeltaE({ L, a, b }, order.targetLab).toFixed(2))
        : null,
      holdings: validHoldings,
      remark: qcRemark.trim(),
      operator: qcOp.trim(),
      time: new Date().toISOString(),
    };
    setQcError("");
    onUpdate({ ...order, qc, status: "待确认" });
  };

  const confirm = () => {
    if (!confirmer.trim()) return alert("请填写确认人");
    onUpdate({
      ...order,
      status: "已确认",
      confirmedBy: confirmer.trim(),
      confirmedAt: new Date().toISOString(),
    });
  };

  const pickup = () => {
    if (order.status !== "已确认") return;
    if (!pickupPerson.trim()) return setHandoverError("请填写领取人");
    const rec: HandoverRecord = {
      id: genId("t"),
      type: "领取",
      person: pickupPerson.trim(),
      time: new Date().toISOString(),
    };
    setHandoverError("");
    onUpdate({ ...order, handovers: [...order.handovers, rec], status: "已交付" });
  };

  const returnToStock = () => {
    if (order.status !== "已确认" && order.status !== "已交付") return;
    if (!returnPerson.trim()) return setHandoverError("请填写退库经办人");
    if (!returnReason.trim()) return setHandoverError("退库必须填写原因，用于生成待重打记录");
    const rec: HandoverRecord = {
      id: genId("t"),
      type: "退库",
      person: returnPerson.trim(),
      reason: returnReason.trim(),
      time: new Date().toISOString(),
    };
    setHandoverError("");
    onUpdate({ ...order, handovers: [...order.handovers, rec], status: "已退库" });
    onAddResample(returnReason.trim(), order);
  };

  const labPreview =
    labL !== "" && labA !== "" && labB !== "" && order.targetLab
      ? calcDeltaE(
          { L: parseFloat(labL), a: parseFloat(labA), b: parseFloat(labB) },
          order.targetLab
        )
      : null;

  return (
    <div className="detail">
      <section className="panel">
        <div className="heading">
          <div>
            <p>打样单 <span className="mono">{order.id}</span></p>
            <h2>
              {order.colorNo} · {order.fabric}{" "}
              <span className={STATUS_CLASS[order.status]}>{order.status}</span>
            </h2>
          </div>
          <button onClick={onBack}>返回列表</button>
        </div>
        <div className="info-grid">
          <div><small>客户订单</small><b>{order.orderNo}</b></div>
          <div><small>浴比</small><b>{order.liquorRatio || "—"}</b></div>
          <div>
            <small>目标 Lab</small>
            <b>
              {order.targetLab
                ? `${order.targetLab.L} / ${order.targetLab.a} / ${order.targetLab.b}`
                : "未录入"}
            </b>
          </div>
          <div><small>创建</small><b>{order.createdBy} · {fmtTime(order.createdAt)}</b></div>
          {order.sourceOrderId && (
            <div><small>重打来源</small><b className="mono">{order.sourceOrderId}</b></div>
          )}
          {order.confirmedBy && (
            <div><small>负责人确认</small><b>{order.confirmedBy} · {fmtTime(order.confirmedAt!)}</b></div>
          )}
        </div>
      </section>

      {/* 配方与称量 */}
      <section className="panel">
        <div className="heading">
          <div>
            <p>第一步 · 配料称量</p>
            <h2>逐项称量（允差 ±{TOLERANCE}g，超差留痕并阻止完成）</h2>
          </div>
          {canWeigh(order.status) && (
            <label className="inline-label">
              <span>称量人</span>
              <input value={weighOp} onChange={(e) => setWeighOp(e.target.value)} placeholder="姓名" />
            </label>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>配方项</th>
                <th>目标重量 (g)</th>
                <th>最近实称 (g)</th>
                <th>偏差 (g)</th>
                <th>判定</th>
                {canWeigh(order.status) && <th>本次称量</th>}
              </tr>
            </thead>
            <tbody>
              {order.recipe.map((item) => {
                const rec = latest.get(item.id);
                return (
                  <tr key={item.id} className={rec?.overTolerance ? "row-danger" : ""}>
                    <td>{item.name}</td>
                    <td>{item.targetWeight.toFixed(3)}</td>
                    <td>{rec ? rec.actualWeight.toFixed(3) : "—"}</td>
                    <td>{rec ? fmtDev(rec.deviation) : "—"}</td>
                    <td>
                      {!rec ? (
                        <span className="tag">待称量</span>
                      ) : rec.overTolerance ? (
                        <span className="tag danger">超差 · 需重称</span>
                      ) : (
                        <span className="tag ok">合格</span>
                      )}
                    </td>
                    {canWeigh(order.status) && (
                      <td className="weigh-cell">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={weights[item.id] ?? ""}
                          onChange={(e) =>
                            setWeights((w) => ({ ...w, [item.id]: e.target.value }))
                          }
                          placeholder="实称 g"
                        />
                        <button onClick={() => recordWeigh(item.id)}>记录</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canWeigh(order.status) && (
          <>
            {blockers.length > 0 ? (
              <div className="notice warn">
                <b>暂不能完成配料：</b>
                <ul>
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="notice ok">全部配方项称量合格，可以完成配料。</div>
            )}
            <div className="actions">
              <button className="primary" disabled={blockers.length > 0} onClick={finishWeighing}>
                完成配料 → 待打样
              </button>
            </div>
          </>
        )}

        {order.weighRecords.length > 0 && (
          <>
            <h3 className="section-title">称量留痕（{order.weighRecords.length} 条）</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>配方项</th>
                    <th>实称 (g)</th>
                    <th>偏差 (g)</th>
                    <th>称量人</th>
                    <th>判定</th>
                  </tr>
                </thead>
                <tbody>
                  {[...order.weighRecords].reverse().map((rec) => {
                    const item = order.recipe.find((r) => r.id === rec.itemId);
                    return (
                      <tr key={rec.id} className={rec.overTolerance ? "row-danger" : ""}>
                        <td>{fmtTime(rec.time)}</td>
                        <td>{item?.name ?? rec.itemId}</td>
                        <td>{rec.actualWeight.toFixed(3)}</td>
                        <td>{fmtDev(rec.deviation)}</td>
                        <td>{rec.operator}</td>
                        <td>
                          {rec.overTolerance ? (
                            <span className="tag danger">超差留痕</span>
                          ) : (
                            <span className="tag ok">合格</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 打样 */}
      {order.status === "待打样" && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>第二步 · 打样</p>
              <h2>配料完成，安排上机打样</h2>
            </div>
          </div>
          <div className="actions">
            <button className="primary" onClick={finishSampling}>
              打样完成 → 送质控
            </button>
          </div>
        </section>
      )}

      {/* 质控 */}
      {(order.status === "待质控" || order.qc) && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>第三步 · 质控</p>
              <h2>Lab 三轴读数与保温记录</h2>
            </div>
          </div>

          {order.qc ? (
            <div className="info-grid">
              <div>
                <small>Lab 读数</small>
                <b>{order.qc.lab.L} / {order.qc.lab.a} / {order.qc.lab.b}</b>
              </div>
              <div>
                <small>ΔE*76</small>
                <b>{order.qc.deltaE !== null ? order.qc.deltaE.toFixed(2) : "无目标 Lab"}</b>
              </div>
              <div>
                <small>保温记录</small>
                <b>{order.qc.holdings.map((h) => `${h.temp}℃×${h.minutes}min`).join("；")}</b>
              </div>
              <div>
                <small>质控</small>
                <b>{order.qc.operator} · {fmtTime(order.qc.time)}</b>
              </div>
              {order.qc.remark && (
                <div className="span-2"><small>备注</small><b>{order.qc.remark}</b></div>
              )}
            </div>
          ) : (
            <>
              <div className="field-grid cols-4">
                <label>
                  <span>L*</span>
                  <input type="number" step="0.01" value={labL} onChange={(e) => setLabL(e.target.value)} />
                </label>
                <label>
                  <span>a*</span>
                  <input type="number" step="0.01" value={labA} onChange={(e) => setLabA(e.target.value)} />
                </label>
                <label>
                  <span>b*</span>
                  <input type="number" step="0.01" value={labB} onChange={(e) => setLabB(e.target.value)} />
                </label>
                <div className="delta-preview">
                  <small>ΔE*76 预览</small>
                  <b>{labPreview !== null && !isNaN(labPreview) ? labPreview.toFixed(2) : "—"}</b>
                </div>
              </div>

              <h3 className="section-title">保温记录</h3>
              <div className="recipe-rows">
                {holdings.map((h, i) => (
                  <div className="recipe-row" key={i}>
                    <input
                      type="number"
                      step="1"
                      value={h.temp}
                      onChange={(e) =>
                        setHoldings((p) => p.map((x, idx) => (idx === i ? { ...x, temp: e.target.value } : x)))
                      }
                      placeholder="保温温度 ℃"
                    />
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={h.minutes}
                      onChange={(e) =>
                        setHoldings((p) => p.map((x, idx) => (idx === i ? { ...x, minutes: e.target.value } : x)))
                      }
                      placeholder="保温时长 min"
                    />
                    <button
                      type="button"
                      onClick={() => setHoldings((p) => p.filter((_, idx) => idx !== i))}
                      disabled={holdings.length === 1}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setHoldings((p) => [...p, { temp: "", minutes: "" }])}>
                + 添加保温段
              </button>

              <div className="field-grid" style={{ marginTop: 14 }}>
                <label>
                  <span>质控备注</span>
                  <input value={qcRemark} onChange={(e) => setQcRemark(e.target.value)} placeholder="选填" />
                </label>
                <label>
                  <span>质控操作人 *</span>
                  <input value={qcOp} onChange={(e) => setQcOp(e.target.value)} placeholder="姓名" />
                </label>
              </div>

              {qcError && <div className="error">{qcError}</div>}
              <div className="actions">
                <button className="primary" onClick={submitQc}>
                  提交质控 → 待确认
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* 负责人确认 */}
      {order.status === "待确认" && (
        <section className="panel confirm-panel">
          <div className="heading">
            <div>
              <p>第四步 · 负责人确认</p>
              <h2>确认前样品不得交予客户</h2>
            </div>
          </div>
          <div className="confirm-row">
            <input
              value={confirmer}
              onChange={(e) => setConfirmer(e.target.value)}
              placeholder="确认人（负责人）姓名"
            />
            <button className="primary" onClick={confirm}>
              确认放行
            </button>
          </div>
        </section>
      )}

      {/* 样品交接 */}
      <section className="panel">
        <div className="heading">
          <div>
            <p>第五步 · 样品交接</p>
            <h2>领取 / 退库（均关联本打样单）</h2>
          </div>
        </div>

        {order.handovers.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>类型</th>
                  <th>经办 / 领取人</th>
                  <th>退库原因</th>
                </tr>
              </thead>
              <tbody>
                {[...order.handovers].reverse().map((h) => (
                  <tr key={h.id}>
                    <td>{fmtTime(h.time)}</td>
                    <td>
                      <span className={h.type === "退库" ? "tag return" : "tag pickup"}>{h.type}</span>
                    </td>
                    <td>{h.person}</td>
                    <td>{h.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {order.status === "已退库" ? (
          <div className="notice ok">
            样品已退库，系统已生成待重打记录，可在「待重打」页签生成重打单。
          </div>
        ) : (
          <>
            {order.status !== "已确认" && order.status !== "已交付" && (
              <div className="notice warn">
                当前状态「{order.status}」：负责人确认前不能把样品交给客户，领取与退库均未开放。
              </div>
            )}
            <div className="handover-grid">
              <div className="handover-box">
                <h3>客户领取</h3>
                <input
                  value={pickupPerson}
                  onChange={(e) => setPickupPerson(e.target.value)}
                  placeholder="领取人"
                  disabled={order.status !== "已确认"}
                />
                <button
                  className="primary"
                  onClick={pickup}
                  disabled={order.status !== "已确认"}
                  title={order.status !== "已确认" ? "需负责人确认后才能交付" : ""}
                >
                  登记领取 → 已交付
                </button>
              </div>
              <div className="handover-box">
                <h3>退库（触发待重打）</h3>
                <input
                  value={returnPerson}
                  onChange={(e) => setReturnPerson(e.target.value)}
                  placeholder="经办人"
                  disabled={order.status !== "已确认" && order.status !== "已交付"}
                />
                <input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="退库原因（必填，将生成待重打记录）"
                  disabled={order.status !== "已确认" && order.status !== "已交付"}
                />
                <button
                  onClick={returnToStock}
                  disabled={order.status !== "已确认" && order.status !== "已交付"}
                  title={
                    order.status !== "已确认" && order.status !== "已交付"
                      ? "需负责人确认后才能退库"
                      : ""
                  }
                >
                  登记退库 → 生成待重打
                </button>
              </div>
            </div>
            {handoverError && <div className="error">{handoverError}</div>}
          </>
        )}
      </section>
    </div>
  );
}
