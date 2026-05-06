"use client";

import { WorkspaceLoading } from "./workspace-loading";

type SessionLoaderProps = {
  label: string;
};

export function SessionLoader({ label }: SessionLoaderProps) {
  return <WorkspaceLoading className="min-h-[320px]" label={label} />;
}
