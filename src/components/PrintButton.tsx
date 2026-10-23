"use client";
import { Icon } from "./Icon";

export function PrintButton({ label = "Save as PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-sm no-print" onClick={() => window.print()}>
      <Icon name="printer" size={14} /> {label}
    </button>
  );
}
