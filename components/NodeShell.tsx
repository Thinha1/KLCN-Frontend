"use client";

import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";

import StatusBadge from "./StatusBadge";
import type { StepStatus } from "@/lib/types";

interface Props {
  title: string;
  subtitle?: string;
  status: StepStatus;
  onRun?: () => void;
  runLabel?: string;
  runDisabled?: boolean;
  hasTarget?: boolean;
  hasSource?: boolean;
  width?: number;
  children: ReactNode;
}

export default function NodeShell({
  title,
  subtitle,
  status,
  onRun,
  runLabel = "Chạy",
  runDisabled,
  hasTarget = true,
  hasSource = true,
  width = 320,
  children,
}: Props) {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
      style={{ width }}
    >
      {hasTarget && <Handle type="target" position={Position.Left} className="!bg-gray-400" />}
      {hasSource && <Handle type="source" position={Position.Right} className="!bg-gray-400" />}

      <div className="flex items-start justify-between gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-800">{title}</div>
          {subtitle && <div className="truncate text-[11px] text-gray-500">{subtitle}</div>}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="p-3 text-xs">{children}</div>

      {onRun && (
        <div className="border-t border-gray-100 px-3 py-2">
          <button
            onClick={onRun}
            disabled={runDisabled || status === "running"}
            className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-indigo-700"
          >
            {status === "running" ? "Đang chạy..." : runLabel}
          </button>
        </div>
      )}
    </div>
  );
}
