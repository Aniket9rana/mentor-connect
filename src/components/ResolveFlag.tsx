"use client";
import { useRouter } from "next/navigation";

export function ResolveFlag({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button className="btn ml-auto shrink-0" onClick={async () => { await fetch("/api/admin/tools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "resolve_flag", id }) }); router.refresh(); }}>
      Resolve
    </button>
  );
}
