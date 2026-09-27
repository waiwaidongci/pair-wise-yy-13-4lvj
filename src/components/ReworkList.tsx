import { useState } from "react";
import type { ReworkRecord } from "../types";
import type { StoreActions } from "../store";
import { Notice, Section } from "./ui";

interface Props {
  reworks: ReworkRecord[];
  actions: StoreActions;
  onCreated: (orderId: string) => void;
}

export function ReworkList({ reworks, actions, onCreated }: Props) {
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const sorted = [...reworks].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <Section
      title="待重打记录"
      extra={<span className="hint">退库自动生成，重打单继承原配方</span>}
    >
      <Notice notice={notice} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>记录号</th>
              <th>原打样单</th>
              <th>客户订单</th>
              <th>布种</th>
              <th>色号</th>
              <th>退回原因</th>
              <th>生成时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  暂无待重打记录
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id}>
                <td className="mono strong">{r.id}</td>
                <td className="mono">{r.sourceOrderId}</td>
                <td>{r.orderNo}</td>
                <td>{r.fabric}</td>
                <td className="mono">{r.colorNo}</td>
                <td>{r.reason}</td>
                <td className="muted">{r.createdAt}</td>
                <td>
                  {r.status === "pending" ? (
                    <span className="badge tag-out">待重打</span>
                  ) : (
                    <span className="badge tag-ok">已重打 → {r.newOrderId}</span>
                  )}
                </td>
                <td>
                  {r.status === "pending" && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const res = actions.createReworkOrder(r.id);
                        if (res.ok && res.id) {
                          onCreated(res.id);
                        } else {
                          setNotice({ kind: "err", text: res.message });
                        }
                      }}
                    >
                      生成重打单
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
