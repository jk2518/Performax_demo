import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Clock3, Database, RefreshCw, Search } from "lucide-react";
import { useGetSystemRecordsQuery } from "../../features/superadmin/systemRecordApi";
import type { SystemRecord, SystemRecordView } from "../../features/superadmin/systemRecordTypes";

const VIEWS: Array<{ id: SystemRecordView; label: string }> = [
  { id: "SYSTEM", label: "System records" },
  { id: "UPDATED", label: "Updated in 30 days" },
  { id: "ATTENTION", label: "Needs attention" },
];

const RECORD_TYPES: Record<SystemRecord["recordType"], string> = {
  EMPLOYEE: "Employee",
  APPRAISAL: "Appraisal",
  APPRAISAL_CYCLE: "Appraisal cycle",
};

const statusTone = (record: SystemRecord) => {
  if (record.attentionRequired) return { background: "#FCEBEB", color: "#791F1F" };
  if (record.status === "ACTIVE" || record.status === "FINALIZED") return { background: "#EAF3DE", color: "#27500A" };
  return { background: "#EEF3FD", color: "#0C447C" };
};

const SystemRecordsPage = () => {
  const [view, setView] = useState<SystemRecordView>("SYSTEM");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const { data: records = [], isLoading, isFetching, isError, refetch } = useGetSystemRecordsQuery({ view, limit });
  const normalizedSearch = search.trim().toLowerCase();
  const visibleRecords = records.filter((record) =>
    [record.title, record.subtitle, record.status, record.recordType, record.attentionReason]
      .some((value) => value?.toLowerCase().includes(normalizedSearch)),
  );
  const attentionCount = records.filter((record) => record.attentionRequired).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database size={18} style={{ color: "#1A56DB" }} aria-hidden="true" />
            <h1 style={{ color: "#111827", fontSize: 18, fontWeight: 600 }}>Record management</h1>
          </div>
          <p style={{ color: "#687080", fontSize: 13, marginTop: 3 }}>
            Review system records and route exceptions to their existing management workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh records"
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border px-3 py-2 text-xs disabled:opacity-50 sm:self-auto"
          style={{ background: "#FFFFFF", borderColor: "#D9DDE5", color: "#364152" }}
        >
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </header>

      <section className="flex flex-col gap-3 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Record views" className="flex flex-wrap gap-1">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              onClick={() => setView(item.id)}
              className="border-b-2 px-3 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: view === item.id ? "#1A56DB" : "transparent",
                color: view === item.id ? "#1648C0" : "#687080",
              }}
            >
              {item.label}
              {item.id === "ATTENTION" && records.length > 0 && view === item.id && (
                <span className="ml-2 rounded px-1.5 py-0.5 text-[10px]" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                  {attentionCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center">
          <label className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#8991A0" }} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search records"
              aria-label="Search records"
              className="w-full rounded-lg border py-2 pl-8 pr-3 text-xs outline-none sm:w-52"
              style={{ background: "#FFFFFF", borderColor: "#D9DDE5", color: "#111827" }}
            />
          </label>
          <label className="sr-only" htmlFor="record-limit">Records per view</label>
          <select
            id="record-limit"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded-lg border px-2.5 py-2 text-xs"
            style={{ background: "#FFFFFF", borderColor: "#D9DDE5", color: "#364152" }}
          >
            {[25, 50, 100].map((value) => <option key={value} value={value}>Latest {value}</option>)}
          </select>
        </div>
      </section>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading records...</p>
      ) : isError ? (
        <div role="alert" className="py-12 text-center text-sm" style={{ color: "#791F1F" }}>
          Unable to load system records. Refresh to try again.
        </div>
      ) : visibleRecords.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-slate-700">No records match this view.</p>
          <p className="mt-1 text-xs text-slate-500">Try another view or clear the search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead style={{ background: "#F7F8FA" }}>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">Record</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last updated</th>
                <th className="px-4 py-3 font-semibold">Administrative review</th>
                <th className="px-4 py-3"><span className="sr-only">Management</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => (
                <tr key={`${record.recordType}-${record.recordId}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{record.title || "Untitled record"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{record.subtitle || `Record ${record.recordId}`}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{RECORD_TYPES[record.recordType]}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md px-2 py-1 text-[10px] font-semibold" style={statusTone(record)}>
                      {record.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={13} aria-hidden="true" />
                      {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "Not available"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {record.attentionRequired ? (
                      <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: "#791F1F" }}>
                        <AlertTriangle size={13} aria-hidden="true" /> {record.attentionReason}
                      </span>
                    ) : <span className="text-slate-400">No action flagged</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={record.managementPath}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium hover:bg-blue-50"
                      style={{ color: "#1648C0" }}
                    >
                      Review <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
            Showing {visibleRecords.length} of up to {limit} records in this view{isFetching ? " · Refreshing" : ""}.
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemRecordsPage;