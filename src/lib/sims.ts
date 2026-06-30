// Data-access layer for the EduSim simulation library (Supabase `simulations`
// table). Ported from the standalone EduSim Hub. Published simulations are
// world-readable (RLS); only the author can insert/update/delete their own.

import { supabase } from "./supabase";

export interface Simulation {
  id: string;
  title: string;
  description: string | null;
  grade_level: string | null;
  subject: string | null;
  sim_type: string; // 'simulation' | 'game' | 'adventure' | 'worksheet'
  concepts: string[];
  standards: string[];
  author_id: string;
  avg_rating: number;
  rating_count: number;
  view_count: number;
  created_at: string;
  // present on full reads / "my sims" only:
  is_published?: boolean;
  html?: string;
  updated_at?: string;
}

export interface SimulationInput {
  title: string;
  description: string | null;
  grade_level: string | null;
  subject: string | null;
  sim_type: string;
  concepts: string[];
  standards: string[];
  html: string;
  is_published: boolean;
  author_id: string;
}

export interface SimFilters {
  search?: string;
  grade?: string;
  subject?: string;
  type?: string; // sim_type
  sort?: "created_at" | "rating" | "views";
}

// Columns safe to list without pulling the (potentially large) html blob.
const BASE_COLUMNS =
  "id, title, description, grade_level, subject, concepts, standards, author_id, " +
  "avg_rating, rating_count, view_count, created_at";
const LIST_COLUMNS = `${BASE_COLUMNS}, sim_type`;

// True if a query failed only because the sim_type column isn't there yet (the
// schema migration hasn't been applied). Lets reads degrade gracefully instead
// of breaking the whole library before the SQL is run.
function isMissingSimType(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  return e.code === "42703" || `${e.message ?? ""}`.toLowerCase().includes("sim_type");
}

/** Browse the shared library with optional filters. Lightweight rows (no html). */
export async function listSimulations(filters: SimFilters = {}): Promise<Simulation[]> {
  const { search, grade, subject, type, sort = "created_at" } = filters;

  const build = (columns: string, withType: boolean) => {
    let q = supabase.from("simulations").select(columns).eq("is_published", true);
    if (grade) q = q.eq("grade_level", grade);
    if (subject) q = q.eq("subject", subject);
    if (withType && type) q = q.eq("sim_type", type);
    if (search && search.trim()) {
      // Strip everything except word chars/space/hyphen so user input can't inject
      // PostgREST filter syntax (',' '.' '()' ':') or LIKE wildcards ('%' '_').
      const term = search.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
      if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    q =
      sort === "rating"
        ? q.order("avg_rating", { ascending: false }).order("rating_count", { ascending: false })
        : sort === "views"
          ? q.order("view_count", { ascending: false })
          : q.order("created_at", { ascending: false });
    return q.limit(200);
  };

  let { data, error } = await build(LIST_COLUMNS, true);
  if (error && isMissingSimType(error)) ({ data, error } = await build(BASE_COLUMNS, false));
  if (error) throw error;
  return (data ?? []) as unknown as Simulation[];
}

/** Full record including html (for the viewer / editor). */
export async function getSimulation(id: string): Promise<Simulation> {
  const { data, error } = await supabase.from("simulations").select("*").eq("id", id).single();
  if (error) throw error;
  return data as unknown as Simulation;
}

export async function getMySimulations(userId: string): Promise<Simulation[]> {
  const fetch = (columns: string) =>
    supabase
      .from("simulations")
      .select(columns)
      .eq("author_id", userId)
      .order("created_at", { ascending: false });

  let { data, error } = await fetch(`${LIST_COLUMNS}, is_published`);
  if (error && isMissingSimType(error)) ({ data, error } = await fetch(`${BASE_COLUMNS}, is_published`));
  if (error) throw error;
  return (data ?? []) as unknown as Simulation[];
}

export async function createSimulation(payload: SimulationInput): Promise<string> {
  const { data, error } = await supabase.from("simulations").insert(payload).select("id").single();
  if (error) throw error;
  return (data as unknown as { id: string }).id;
}

export async function updateSimulation(id: string, payload: Partial<SimulationInput>): Promise<void> {
  // .select() so we can detect a zero-row update — PostgREST returns no error
  // when RLS filters the row out, which would otherwise look like success.
  const { data, error } = await supabase.from("simulations").update(payload).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Couldn't save — you may not have permission to edit this simulation.");
  }
}

export async function deleteSimulation(id: string): Promise<void> {
  const { data, error } = await supabase.from("simulations").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Couldn't delete — you may not have permission, or it no longer exists.");
  }
}

export async function incrementView(id: string): Promise<void> {
  // Fire-and-forget; a failed view count must never block rendering a sim.
  await supabase.rpc("increment_view", { sim_id: id }).then(
    () => {},
    () => {},
  );
}

/** Author display names for a set of author ids → { id: name }. */
export async function getAuthorNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  if (error) return {};
  const rows = (data ?? []) as unknown as { id: string; display_name: string }[];
  return Object.fromEntries(rows.map((p) => [p.id, p.display_name]));
}

/** Rating aggregates only — avoids re-downloading the html blob after a vote. */
export async function getSimulationStats(
  id: string,
): Promise<{ avg_rating: number; rating_count: number } | null> {
  const { data } = await supabase
    .from("simulations")
    .select("avg_rating, rating_count")
    .eq("id", id)
    .single();
  return (data as unknown as { avg_rating: number; rating_count: number } | null) ?? null;
}

export async function getMyRating(simulationId: string, userId: string | null): Promise<number | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("ratings")
    .select("rating")
    .eq("simulation_id", simulationId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as { rating: number } | null)?.rating ?? null;
}

export async function rateSimulation(simulationId: string, userId: string, rating: number): Promise<void> {
  const { error } = await supabase
    .from("ratings")
    .upsert(
      { simulation_id: simulationId, user_id: userId, rating },
      { onConflict: "simulation_id,user_id" },
    );
  if (error) throw error;
}
