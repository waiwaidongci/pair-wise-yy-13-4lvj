import { useState } from "react";
import "./styles.css";
import { useLabStore } from "./store";
import { OrderList } from "./components/OrderList";
import { OrderDetail } from "./components/OrderDetail";
import { NewOrderForm } from "./components/NewOrderForm";
import { ReworkList } from "./components/ReworkList";

type Tab = "orders" | "new" | "reworks";

const FLOW_STEPS = ["新建打样单", "配料称量", "打样", "质控录入", "待确认", "负责人确认", "领取 / 退库", "退库→待重打"];

function App() {
  const store = useLabStore();
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = store.orders.find((o) => o.id === selectedId) ?? null;
  const pendingReworks = store.reworks.filter((r) => r.status === "pending").length;

  const metrics = [
    { label: "打样单总数", value: store.orders.length },
    { label: "待确认", value: store.orders.filter((o) => o.status === "pending_confirm").length },
    { label: "待重打", value: pendingReworks },
    {
      label: "称量偏差留痕",
      value: store.orders.reduce((n, o) => n + o.deviations.length, 0),
    },
  ];

  const gotoOrder = (id: string) => {
    setSelectedId(id);
    setTab("orders");
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <p>染整实验台 · 小样全流程追踪</p>
          <h1>打样与样品交接管理</h1>
          <span className="sub">
            打样单 → 称量（±0.01g 留痕）→ 质控 Lab/保温 → 待确认 → 负责人放行 → 领取/退库 → 待重打，全程关联原单。
          </span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (window.confirm("将清空本地数据并恢复演示数据，确定？")) store.actions.reset();
          }}
        >
          重置演示数据
        </button>
      </header>

      <div className="flow">
        {FLOW_STEPS.map((s, i) => (
          <span key={s} className="flow-step">
            {s}
            {i < FLOW_STEPS.length - 1 && <i>→</i>}
          </span>
        ))}
      </div>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <nav className="tabs">
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          打样单列表
        </button>
        <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}>
          新建打样单
        </button>
        <button className={tab === "reworks" ? "active" : ""} onClick={() => setTab("reworks")}>
          待重打{pendingReworks > 0 ? `（${pendingReworks}）` : ""}
        </button>
      </nav>

      {tab === "orders" && (
        <div className="layout">
          <OrderList orders={store.orders} selectedId={selectedId} onSelect={setSelectedId} />
          {selected ? (
            <OrderDetail key={selected.id} order={selected} actions={store.actions} />
          ) : (
            <div className="card placeholder">
              <h3>未选择打样单</h3>
              <p className="muted">点击左侧任意一单，查看称量、质控、确认与交接的完整链路。</p>
            </div>
          )}
        </div>
      )}

      {tab === "new" && <NewOrderForm actions={store.actions} onCreated={gotoOrder} />}

      {tab === "reworks" && (
        <ReworkList reworks={store.reworks} actions={store.actions} onCreated={gotoOrder} />
      )}
    </main>
  );
}

export default App;
