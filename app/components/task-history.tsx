import type { TaskHistoryEntry } from "../../src/ui/task-history";

export function TaskHistory(props: {
  entries: TaskHistoryEntry[];
  selectedId?: string;
  loading: boolean;
  error: string | null;
  offset: number;
  hasMore: boolean;
  disabled: boolean;
  onPage(offset: number): void;
  onSelect(id: string): void;
  onNew(): void;
}) {
  return <section className="task-history" aria-labelledby="task-history-heading" aria-busy={props.loading}>
    <div className="task-history-heading"><div><h3 id="task-history-heading">Your tasks</h3><p>Saved to your wallet. Open a task to pick up where you left off.</p></div><button className="secondary" disabled={props.disabled} onClick={props.onNew} type="button">+ New task</button></div>
    {props.loading ? <p aria-live="polite" className="history-feedback">Loading your tasks…</p> : props.error ? <div className="history-feedback"><p aria-live="polite" className="error">{props.error}</p><button className="secondary" onClick={() => props.onPage(props.offset)} type="button">Try again</button></div> : props.entries.length === 0 ? <p className="history-feedback">No saved tasks yet. Create one below to get started.</p> : <ul className="task-history-list">
      {props.entries.map(entry => <li key={entry.id}><a href={`/app?task=${encodeURIComponent(entry.id)}`} aria-current={entry.id === props.selectedId ? "true" : undefined} aria-disabled={props.disabled} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); if (!props.disabled) props.onSelect(entry.id); }}><span className="history-task-icon" aria-hidden="true">↳</span><div><strong>Task {entry.id.slice(0, 8)}</strong><small translate="no">{entry.paymentAddress.slice(0, 7)}…{entry.paymentAddress.slice(-5)}</small></div><span className={`status-pill ${entry.fundingSignature ? "success" : "warning"}`}>{entry.fundingSignature ? "Funding confirmed" : "Funding unconfirmed"}</span><span aria-hidden="true">→</span></a></li>)}
    </ul>}
    <div className="task-history-pagination"><button className="secondary" disabled={props.offset === 0 || props.loading || props.disabled} onClick={() => props.onPage(Math.max(0, props.offset - 20))} type="button">Previous</button><span>Page {Math.floor(props.offset / 20) + 1}</span><button className="secondary" disabled={!props.hasMore || props.loading || props.disabled} onClick={() => props.onPage(props.offset + 20)} type="button">Next</button></div>
  </section>;
}
