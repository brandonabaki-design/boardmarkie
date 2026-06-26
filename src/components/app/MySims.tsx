"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { getMySimulations, deleteSimulation, type Simulation } from "@/lib/sims";
import { useSupabaseUser } from "@/lib/supabaseAuth";
import { Stars } from "./Stars";
import { SimSignIn } from "./SimSignIn";

export function MySims() {
  const { user, loading: authLoading } = useSupabaseUser();
  const [rows, setRows] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    getMySimulations(user.id)
      .then((data) => active && setRows(data))
      .catch((e) => active && setError(e?.message || "Could not load your simulations."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this simulation? This can't be undone.")) return;
    try {
      await deleteSimulation(id);
      setRows((r) => r.filter((s) => s.id !== id));
    } catch (e) {
      setError((e as Error)?.message || "Delete failed.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-paper">
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link href="/sims/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} /> Library
        </Link>
        <span className="font-display text-lg font-extrabold tracking-tight text-ink">My simulations</span>
        <Link
          href="/sims/new/"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> New
        </Link>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {!authLoading && !user ? (
          <SimSignIn heading="Sign in to see your simulations" />
        ) : loading ? (
          <div className="py-16 text-center text-sm text-muted">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <p className="text-muted">You haven&apos;t created any simulations yet.</p>
            <Link
              href="/sims/new/"
              className="mt-3 inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Create your first
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white card-shadow">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-paper/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Rating</th>
                  <th className="px-3 py-3">Views</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-paper/40">
                    <td className="px-4 py-3 font-semibold text-ink">
                      <Link href={`/sim/?id=${s.id}`} className="inline-flex items-center gap-1.5 hover:text-brand-700">
                        {s.title} <ExternalLink size={13} className="text-muted" />
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {s.is_published ? (
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-muted">Draft</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Stars value={Number(s.avg_rating) || 0} count={s.rating_count} size={13} />
                    </td>
                    <td className="px-3 py-3 text-muted">{s.view_count}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/sims/edit/?id=${s.id}`}
                          title="Edit"
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => remove(s.id)}
                          title="Delete"
                          className="grid h-8 w-8 place-items-center rounded-lg text-coral hover:bg-coral/10"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
