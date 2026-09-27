import { useState } from "react";
import type { OrderStatus, SampleOrder } from "../types";
import { STATUS_LABEL, STATUS_OPTIONS } from "../types";
import { StatusBadge } from "./ui";

interface Props {
  orders: SampleOrder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function lastHandover(order: SampleOrder): string {
  const last = order.handovers[order.handovers.length - 1];
  if (!last) return "—";
  const who = last.type === "delivered" ? `领取 · ${last.receiver ?? ""}` : `退库 · ${last.operator}`;
  return `${who} · ${last.at}`;
}

export function OrderList({ orders, selectedId, onSelect }: Props) {
  const [fColor, setFColor] = useState("");
  const [fOrder, setFOrder] = useState("");
  const [fStatus, setFStatus] = useState<"all" | OrderStatus>("all");

  const filtered = orders
    .filter((o) => o.colorNo.toLowerCase().includes(fColor.trim().toLowerCase()))
    .filter((o) => o.orderNo.toLowerCase().includes(fOrder.trim().toLowerCase()))
    .filter((o) => (fStatus === "all" ? true : o.status === fStatus))
    .sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="card list-card">
      <header className="card-head">
        <h3>打样单列表</h3>
        <span className="hint">共 {filtered.length} 单</span>
      </header>

      <div className="filter-bar">
        <input
          placeholder="按色号筛选，如 RD-305"
          value={fColor}
          onChange={(e) => setFColor(e.target.value)}
        />
        <input
          placeholder="按客户订单筛选，如 SO-2026"
          value={fOrder}
          onChange={(e) => setFOrder(e.target.value)}
        />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as "all" | OrderStatus)}>
          <option value="all">全部状态</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>打样单号</th>
              <th>客户订单</th>
              <th>布种</th>
              <th>色号</th>
              <th>状态</th>
              <th>最近交接</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  没有符合条件的打样单
                </td>
              </tr>
            )}
            {filtered.map((o) => (
              <tr
                key={o.id}
                className={`clickable ${o.id === selectedId ? "selected" : ""}`}
                onClick={() => onSelect(o.id)}
              >
                <td className="mono strong">{o.id}</td>
                <td>{o.orderNo}</td>
                <td>{o.fabric}</td>
                <td className="mono">{o.colorNo}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="muted">{lastHandover(o)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
