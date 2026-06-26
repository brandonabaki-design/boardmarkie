"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import { GRADE_LEVELS, SUBJECTS } from "@/lib/taxonomy";
import { createSimulation, getSimulation, updateSimulation } from "@/lib/sims";
import { extractSimMetadata } from "@/lib/client";
import { useSupabaseUser } from "@/lib/supabaseAuth";
import { SandboxedHtml } from "./SandboxedHtml";
import { TagInput } from "./TagInput";
import { SimSignIn } from "./SimSignIn";
import { Field, Select, TextArea, Toggle, Spinner } from "./ui";

interface Form {
  title: string;
  description: string;
  grade_level: string;
  subject: string;
  concepts: string[];
  standards: string[];
  html: string;
  is_published: boolean;
}

const EMPTY: Form = {
  title: "",
  description: "",
  grade_level: "",
  subject: "",
  concepts: [],
  standards: [],
  html: "",
  is_published: true,
};

export function SimEditor() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const editing = Boolean(id);
  const { user, loading: authLoading } = useSupabaseUser();

  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const autoRan = useRef(false);

  const set = <K extends keyof Form>(key: K, val: Form[K]) => setForm((f) => ({ ...f, [key]: val }));

  // Load an existing simulation when editing.
  useEffect(() => {
    if (!editing) return;
    let active = true;
    getSimulation(id)
      .then((sim) => {
        if (!active) return;
        autoRan.current = true; // don't auto-categorize an already-saved sim
        setForm({
          title: sim.title || "",
          description: sim.description || "",
          grade_level: sim.grade_level || "",
          subject: sim.subject || "",
          concepts: sim.concepts || [],
          standards: sim.standards || [],
          html: sim.html || "",
          is_published: sim.is_published ?? true,
        });
      })
      .catch((e) => active && setError(e?.message || "Could not load this simulation."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, editing]);

  // Run the AI extractor. overwrite=true replaces all fields (manual button);
  // overwrite=false only fills blanks (auto-run on first paste).
  const categorize = async (overwrite: boolean) => {
    if (!form.html.trim() || categorizing) return;
    setCategorizing(true);
    setError("");
    setNotice("");
    try {
      const meta = await extractSimMetadata(form.html);
      // Fill blanks always; overwrite existing values only on an explicit re-run.
      const pick = (cur: string, next: string) => (overwrite || !cur ? next || cur : cur);
      const pickArr = (cur: string[], next: string[]) =>
        overwrite || cur.length === 0 ? (next.length ? next : cur) : cur;
      setForm((f) => ({
        ...f,
        title: pick(f.title, meta.title),
        description: pick(f.description, meta.description),
        grade_level: pick(f.grade_level, meta.grade_level),
        subject: pick(f.subject, meta.subject),
        concepts: pickArr(f.concepts, meta.concepts),
        standards: pickArr(f.standards, meta.standards),
      }));
      setNotice("Details auto-filled from the simulation — review and tweak before publishing.");
    } catch (e) {
      setError((e as Error)?.message || "Couldn't auto-categorize. Fill the details in manually.");
    } finally {
      setCategorizing(false);
    }
  };

  // Auto-categorize once, the first time a substantial chunk of HTML is pasted.
  useEffect(() => {
    if (autoRan.current) return;
    if (form.html.trim().length > 200 && !form.title) {
      autoRan.current = true;
      void categorize(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.html]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) return;
    if (!form.title.trim()) return setError("Please give it a title.");
    if (!form.html.trim()) return setError("Paste the simulation HTML before saving.");
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        grade_level: form.grade_level || null,
        subject: form.subject || null,
        concepts: form.concepts,
        standards: form.standards,
        html: form.html,
        is_published: form.is_published,
        author_id: user.id,
      };
      if (editing) {
        await updateSimulation(id, payload);
        router.push(`/sim/?id=${id}`);
      } else {
        const newId = await createSimulation(payload);
        router.push(`/sim/?id=${newId}`);
      }
    } catch (err) {
      setError((err as Error)?.message || "Save failed.");
      setSaving(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-[100dvh] bg-paper">
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-12">
          <SimSignIn />
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="grid h-[100dvh] place-items-center text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-paper">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-ink">
          {editing ? "Edit simulation" : "New simulation"}
        </h1>
        <p className="mb-4 text-sm text-muted">
          Paste the HTML you got from Gemini. We&apos;ll auto-detect the grade, subject, topics and standards — then it
          gets a unique link + QR you can drop onto a slide.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            {notice}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Title">
              <input
                value={form.title}
                maxLength={200}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Photosynthesis Lab"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </Field>

            <Field label="Description">
              <TextArea
                rows={2}
                value={form.description}
                maxLength={2000}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What students will explore, simulate, and be assessed on."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Grade level">
                <Select value={form.grade_level} onChange={(e) => set("grade_level", e.target.value)}>
                  <option value="">—</option>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Subject">
                <Select value={form.subject} onChange={(e) => set("subject", e.target.value)}>
                  <option value="">—</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Concepts">
              <TagInput value={form.concepts} onChange={(v) => set("concepts", v)} placeholder="Type a concept, press Enter" />
            </Field>

            <Field label="Standards">
              <TagInput
                value={form.standards}
                onChange={(v) => set("standards", v)}
                placeholder="e.g. NGSS MS-LS1-6, press Enter"
              />
            </Field>

            <Field label="Simulation HTML">
              <TextArea
                rows={10}
                value={form.html}
                onChange={(e) => set("html", e.target.value)}
                placeholder="Paste the full HTML you got from Gemini here…"
                spellCheck={false}
                className="font-mono text-xs"
              />
            </Field>

            <button
              type="button"
              onClick={() => categorize(true)}
              disabled={!form.html.trim() || categorizing}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 disabled:opacity-50"
            >
              {categorizing ? <Spinner /> : <Sparkles size={15} className="text-brand-600" />}
              {categorizing ? "Reading simulation…" : "Auto-fill details from simulation"}
            </button>

            <div className="rounded-xl border border-line bg-white px-4 py-3">
              <Toggle
                label="Publish to the shared library"
                hint="Uncheck to keep it as a private draft only you can see."
                checked={form.is_published}
                onChange={(v) => set("is_published", v)}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Spinner /> : null}
              {saving ? "Saving…" : editing ? "Save changes" : "Publish simulation"}
            </button>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Wand2 size={14} className="text-brand-600" /> Live preview
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-white card-shadow">
              {form.html.trim() ? (
                <SandboxedHtml html={form.html} title="Preview" />
              ) : (
                <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">
                  Your simulation will render here as you paste.
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
      <Link href="/sims/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Library
      </Link>
      <span className="font-display text-lg font-extrabold tracking-tight text-ink">EduSim</span>
    </header>
  );
}
