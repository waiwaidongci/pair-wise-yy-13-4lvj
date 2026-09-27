import { ResampleTask, SampleOrder } from "../types";
import { fmtTime } from "../store";

interface Props {
  tasks: ResampleTask[];
  orders: SampleOrder[];
  onGenerate: (task: ResampleTask) => void;
  onViewOrder: (id: string) => void;
}

export default function ResampleList({ tasks, orders, onGenerate, onViewOrder }: Props) {
  const sourceOf = (t: ResampleTask) => orders.find((o) => o.id === t.sourceOrderId);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>退库重打</p>
          <h2>待重打记录</h2>
        </div>
        <span className="muted">
          待处理 {tasks.filter((t) => t.status === "待重打").length} 条
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>记录号</th>
              <th>来源打样单</th>
              <th>客户订单</th>
              <th>色号</th>
              <th>退回原因</th>
              <th>退回时间</th>
              <th>状态</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const src = sourceOf(t);
              return (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td>
                    <button className="link" onClick={() => onViewOrder(t.sourceOrderId)}>
                      {t.sourceOrderId}
                    </button>
                  </td>
                  <td>{src?.orderNo ?? "—"}</td>
                  <td>{src?.colorNo ?? "—"}</td>
                  <td className="reason-cell">{t.reason}</td>
                  <td>{fmtTime(t.createdAt)}</td>
                  <td>
                    {t.status === "待重打" ? (
                      <span className="tag danger">待重打</span>
                    ) : (
                      <span className="tag ok">已生成 {t.handledByOrderId}</span>
                    )}
                  </td>
                  <td>
                    {t.status === "待重打" && src && (
                      <button className="primary" onClick={() => onGenerate(t)}>
                        生成重打单
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8} className="muted center">
                  暂无退库重打记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
