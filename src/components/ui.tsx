import type { ReactNode } from "react";
import type { OrderStatus } from "../types";
import { STATUS_LABEL } from "../types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge st-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Section({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <header className="card-head">
        <h3>{title}</h3>
        {extra}
      </header>
      {children}
    </section>
  );
}

export function Notice({ notice }: { notice: { kind: "ok" | "err"; text: string } | null }) {
  if (!notice) return null;
  return <p className={`notice ${notice.kind}`}>{notice.text}</p>;
}
