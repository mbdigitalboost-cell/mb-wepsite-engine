------------------------------------------------
-- PLATFORM MIGRATION 0023
-- FAZ 2C-2.1 hardening — revoke unnecessary PUBLIC/anon/authenticated
-- EXECUTE grants from trigger-only / event-trigger-only functions.
--
-- public.handle_new_user() (migration 0004, RETURNS trigger) and
-- public.rls_auto_enable() (RETURNS event_trigger, pre-existing in this
-- project, not created by any migration in this repo) both got the same
-- default PostgreSQL behavior migration 0012/0013/0020/0021 already
-- fixed for every OTHER function here: a newly created function grants
-- EXECUTE to PUBLIC by default, which cascades to `anon` and
-- `authenticated` — nobody explicitly asked for that, it is just
-- Postgres' own default.
--
-- WHY THIS IS SAFE (unlike a normal RPC-callable helper, no re-grant to
-- `authenticated` is needed here, unlike migration 0020's own
-- extract_store_id_from_object_path): PostgreSQL refuses to invoke a
-- function whose return type is `trigger` or `event_trigger` outside of
-- its own trigger/event-trigger context — "trigger functions can only
-- be called as triggers" is a hard engine-level error, not merely a
-- convention. `handle_new_user()` only ever runs via the
-- `on_auth_user_created` trigger on `auth.users` (migration 0004);
-- `rls_auto_enable()` only ever runs via its own event trigger. Neither
-- has EVER been callable as `select public.handle_new_user()` even with
-- these grants intact — this migration closes a Supabase security
-- advisor / "anon/authenticated_security_definer_function_executable"
-- lint finding (already investigated and knowingly deferred in
-- claude/FAZ5B_SECURITY_HARDENING_AUDIT.md §12: "yani EXECUTE grant'ı
-- olsa bile fiilen istismar edilemez") for defense-in-depth / least-
-- privilege hygiene, NOT because either function was ever actually
-- exploitable.
--
-- Trigger/event-trigger invocation itself is UNAFFECTED by this
-- revoke — Postgres invokes a trigger function as the table owner
-- regardless of the calling role's own EXECUTE grants, so
-- `on_auth_user_created` (sign-up) and the RLS-auto-enable event
-- trigger keep working exactly as before.
--
-- SCOPE: EXECUTE grants only, on exactly these two functions. No table
-- alteration, no data modification, no other function touched — every
-- other SECURITY DEFINER helper (is_store_member, is_store_editor_member,
-- is_store_admin_member, is_store_publicly_visible, is_customer_member,
-- is_platform_admin, extract_store_id_from_object_path) is deliberately
-- left untouched; those ARE meant to be called directly (by RLS policies
-- running as `authenticated`/`anon`), unlike these two.
------------------------------------------------

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
