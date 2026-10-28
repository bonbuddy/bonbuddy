# BonBuddy-Website (www.bonbuddy.de)

Statisches HTML/CSS, gehostet über GitHub Pages direkt aus dem Branch `main` (Root-Ordner).
**Alles, was auf `main` landet, ist sofort live.**

## Git-Regeln (gelten für jede Sitzung)

- **Niemals auf `main` committen, pushen oder mergen.**
- Nur auf Feature-Branches arbeiten (z. B. `feature/lh-zaehler`).
- Branch pushen und Pull Request erstellen **erst nach ausdrücklicher Freigabe** – vorher fragen.
- Pull Requests **niemals selbst mergen**, das macht das Team.
- Kein `git push --force` / `--force-with-lease`.
- Keine Änderungen an GitHub-Pages- oder Repo-Einstellungen (Settings, Branch-Schutz, CNAME, Pages-Quelle).

## Supabase

- Projekt: `https://uxvjwzxvqvkanuudcnac.supabase.co`
- Im Frontend nur der Publishable Key, und nur für den Aufruf von `get_city_savings`.
- Der Service-Role-Key kommt niemals ins Frontend oder ins Repo.
- Datenbank-Änderungen nur als SQL-Migration unter `supabase/migrations/`. Das Team spielt sie selbst im
  Supabase-SQL-Editor ein; die CLI nicht mit dem Projekt verbinden, nichts per Hand in der Produktion ändern.
- Die Tabelle `city_savings` und bestehende Policies nicht verändern (wird von der App befüllt).

## Konventionen

- Schrift Jost und Material Symbols werden lokal aus `fonts/` ausgeliefert – keine Google-Fonts-Links einbauen.
- Markenfarbe `#519e8a`, Textfarbe `#2a2a2a`.
- Kein zusätzliches Tracking. Google Analytics nur nach Einwilligung im Cookie-Banner.
