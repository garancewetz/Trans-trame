# Auth : lecture seule publique + écriture authentifiée

## À faire

- [ ] **Auth Supabase** — implémenter un flow de connexion (magic link, email+password, ou OAuth type Google/GitHub)
- [ ] **Hook `useAuth`** — gérer session, user, état de connexion dans l'app React
- [ ] **RLS policies** — migration SQL : `SELECT` pour tous (`anon`), `INSERT/UPDATE/DELETE` pour les users authentifiés (`authenticated`) sur toutes les tables (books, authors, links…)
- [ ] **Protection UI** — masquer/désactiver les boutons d'édition, le panneau admin, et les actions CRUD pour les visiteurs non connectés
- [ ] **Bouton login/logout** — ajouter dans la navbar

## Décisions à prendre

- Méthode de connexion : magic link, email+password, OAuth ?
- Qui peut s'inscrire : ouvert à tous ou sur invitation ?
- Tables à protéger en écriture : toutes ou seulement certaines ?
