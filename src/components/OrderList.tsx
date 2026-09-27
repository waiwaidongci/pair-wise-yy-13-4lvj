import { useMemo, useState } from "react";
import { SampleOrder, STATUS_FLOW } from "../types";
import { STATUS_CLASS, fmtTime } from "../store";

interface Props {
  orders: SampleOrder[];
  onSelect: (id: string) => void;
}

export default function OrderList({ orders, onSelect }: Props) {
  const [colorFilter, setColorFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (colorFilter && !o.colorNo.toLowerCase().includes(colorFilter.trim().toLowerCase())) return false;
        if (orderFilter && !o.orderNo.toLowerCase().includes(orderFilter.trim().toLowerCase())) return false;
        if (statusFilter !== "全部" && o.status !== statusFilter) return false;
        return true;
      }),
    [orders, colorFilter, orderFilter, statusFilter]
  );

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>打样单台账</p>
          <h2>按色号 / 订单 / 状态查看交接</h2>
        </div>
        <span className="muted">共 {filtered.length} 单</span>
      </div>

      <div className="filters">
        <label>
          <span>色号</span>
          <input
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            placeholder="如 C-5021"
          />
        </label>
        <label>
          <span>客户订单</span>
          <input
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            placeholder="如 SO-2026"
          />
        </label>
        <label>
          <span>状态</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>全部</option>
            {STATUS_FLOW.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>打样单号</th>
              <th>客户订单</th>
              <th>布种</th>
              <th>目标色号</th>
              <th>状态</th>
              <th>最近交接</th>
              <th>创建时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const last = o.handovers[o.handovers.length - 1];
              return (
                <tr key={o.id}>
                  <td className="mono">{o.id}</td>
                  <td>{o.orderNo}</td>
                  <td>{o.fabric}</td>
                  <td>{o.colorNo}</td>
                  <td>
                    <span className={STATUS_CLASS[o.status]}>{o.status}</span>
                  </td>
                  <td>
                    {last ? (
                      <>
                        <span className={last.type === "退库" ? "tag return" : "tag pickup"}>
                          {last.type}
                        </span>{" "}
                        {last.person} · {fmtTime(last.time)}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{fmtTime(o.createdAt)}</td>
                  <td>
                    <button onClick={() => onSelect(o.id)}>处理</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="muted center">
                  没有匹配的打样单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
