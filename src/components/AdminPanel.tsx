"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncScoresAction } from "@/app/actions";

export function AdminPanel({ requiresPassword }: { requiresPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function sync() {
    setMsg(null);
    startTransition(async () => {
      const res = await syncScoresAction(password);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {requiresPassword && (
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-wc-gold"
        />
      )}
      <button className="btn-primary w-full" onClick={sync} disabled={pending}>
        {pending ? "Syncing…" : "🔄 Sync scores now"}
      </button>
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-wc-green" : "text-wc-red"}`}>{msg.text}</p>
      )}
    </div>
  );
}
