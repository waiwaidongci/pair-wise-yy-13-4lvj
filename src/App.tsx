import { useEffect, useState } from "react";
import "./styles.css";
import { ResampleTask, SampleOrder } from "./types";
import {
  loadOrders,
  loadResamples,
  nextOrderNo,
  saveOrders,
  saveResamples,
} from "./store";
import OrderList from "./components/OrderList";
import NewOrderForm from "./components/NewOrderForm";
import OrderDetail from "./components/OrderDetail";
import ResampleList from "./components/ResampleList";

type Tab = "list" | "new" | "resample";

function App() {
  const [orders, setOrders] = useState<SampleOrder[]>(loadOrders);
  const [resamples, setResamples] = useState<ResampleTask[]>(loadResamples);
  const [tab, setTab] = useState<Tab>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{ source: SampleOrder; taskId: string } | null>(null);

  useEffect(() => saveOrders(orders), [orders]);
  useEffect(() => saveResamples(resamples), [resamples]);

  const updateOrder = (updated: SampleOrder) =>
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

  const addResample = (reason: string, source: SampleOrder) =>
    setResamples((prev) => [
      ...prev,
      {
        id: `RS-${String(prev.length + 1).padStart(4, "0")}`,
        sourceOrderId: source.id,
        reason,
        status: "待重打",
        createdAt: new Date().toISOString(),
      },
    ]);

  const createOrder = (draft: Omit<SampleOrder, "id">) => {
    const order: SampleOrder = { ...draft, id: nextOrderNo(orders) };
    setOrders((prev) => [...prev, order]);
    if (prefill) {
      setResamples((prev) =>
        prev.map((t) =>
          t.id === prefill.taskId
            ? { ...t, status: "已生成重打单", handledByOrderId: order.id }
            : t
        )
      );
      setPrefill(null);
    }
    setTab("list");
    setSelectedId(order.id);
  };

  const generateFromTask = (task: ResampleTask) => {
    const source = orders.find((o) => o.id === task.sourceOrderId);
    if (!source) return;
    setPrefill({ source, taskId: task.id });
    setSelectedId(null);
    setTab("new");
  };

  const viewOrder = (id: string) => {
    setSelectedId(id);
    setTab("list");
  };

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const pendingConfirm = orders.filter((o) => o.status === "待确认").length;
  const delivered = orders.filter((o) => o.status === "已交付").length;
  const pendingResample = resamples.filter((t) => t.status === "待重打").length;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62012 · 纺织染整实验台</p>
        <h1>打样流转与样品交接管理</h1>
        <span>
          打样单录入订单、布种、目标色号与配方；配料逐项称量，偏差超 ±0.01g
          自动留痕并阻止完成；质控录入 Lab 三轴读数与保温记录后进入待确认，负责人确认前样品不得交予客户；领取与退库均关联原打样单，退库自动生成待重打记录。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>打样单总数</small>
          <strong>{orders.length}</strong>
        </article>
        <article>
          <small>待确认</small>
          <strong>{pendingConfirm}</strong>
        </article>
        <article>
          <small>已交付</small>
          <strong>{delivered}</strong>
        </article>
        <article>
          <small>待重打</small>
          <strong>{pendingResample}</strong>
        </article>
      </section>

      <nav className="tabs">
        <button
          className={tab === "list" ? "active" : ""}
          onClick={() => {
            setTab("list");
            setSelectedId(null);
          }}
        >
          打样单列表
        </button>
        <button
          className={tab === "new" ? "active" : ""}
          onClick={() => {
            setPrefill(null);
            setTab("new");
          }}
        >
          新建打样单
        </button>
        <button
          className={tab === "resample" ? "active" : ""}
          onClick={() => setTab("resample")}
        >
          待重打{pendingResample > 0 ? `（${pendingResample}）` : ""}
        </button>
      </nav>

      {tab === "list" &&
        (selected ? (
          <OrderDetail
            order={selected}
            onUpdate={updateOrder}
            onAddResample={addResample}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <OrderList orders={orders} onSelect={setSelectedId} />
        ))}

      {tab === "new" && (
        <NewOrderForm
          prefill={prefill?.source ?? null}
          onSubmit={createOrder}
          onCancel={() => {
            setPrefill(null);
            setTab("list");
          }}
        />
      )}

      {tab === "resample" && (
        <ResampleList
          tasks={resamples}
          orders={orders}
          onGenerate={generateFromTask}
          onViewOrder={viewOrder}
        />
      )}
    </main>
  );
}

export default App;
