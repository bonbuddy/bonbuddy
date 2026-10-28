-- Öffentlicher Lesezugriff auf die Ersparnis-Summe einer Stadt für den Website-Zähler.
--
-- Statt die Tabelle city_savings per RLS für anon lesbar zu machen, gibt diese Funktion
-- genau eine Stadt-Summe heraus (total_cents, updated_at) – keine anderen Städte,
-- kein purchase_count. Die Tabelle und ihre Policies bleiben unverändert.
--
-- security definer: läuft mit den Rechten des Eigentümers (postgres) und funktioniert
-- damit unabhängig davon, welche RLS-Policies auf city_savings bestehen.
-- set search_path = '': verhindert, dass Objekte über einen manipulierten Suchpfad
-- untergeschoben werden; alle Namen sind voll qualifiziert.

create or replace function public.get_city_savings(p_city text)
returns table (total_cents bigint, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Browser dürfen die Antwort 30 Sekunden zwischenspeichern (PostgREST setzt den Header).
  perform pg_catalog.set_config(
    'response.headers',
    '[{"Cache-Control": "public, max-age=30"}]',
    true
  );

  return query
    select cs.total_cents, cs.updated_at
    from public.city_savings as cs
    where cs.city = pg_catalog.lower(pg_catalog.btrim(p_city));
end;
$$;

comment on function public.get_city_savings(text) is
  'Website-Zähler: liefert total_cents und updated_at für genau eine Stadt (Slug, z. B. luedinghausen).';

-- Nur anon/authenticated dürfen die Funktion aufrufen.
revoke all on function public.get_city_savings(text) from public;
grant execute on function public.get_city_savings(text) to anon, authenticated;
