# ALuNI – Plateforme e-learning et de certification

Plateforme de l'**Académie Lumière du Numérique et de l'Innovation** (CDEJ TG0157, Kpévé).

| Dossier | Contenu |
|---|---|
| `frontend/` | Interface web React 19 + Vite + Tailwind CSS (site vitrine, espaces apprenant, formateur, administrateur) |
| `backend/` | API REST Spring Boot 3.5 (Java 17) + PostgreSQL 17, migrations Flyway |

## Démarrage avec Docker (recommandé)

Seul Docker (avec Docker Compose) est nécessaire.

```bash
cp .env.example .env      # puis renseignez DB_PASSWORD, JWT_SECRET, CERT_SECRET, DEMO_PASSWORD
docker compose up -d --build
```

Le site est alors disponible sur http://localhost (port modifiable avec `HTTP_PORT`). Trois conteneurs sont lancés :

| Service | Rôle |
|---|---|
| `db` | PostgreSQL 17 (données dans le volume `pgdata`) |
| `backend` | API Spring Boot (fichiers déposés dans le volume `uploads`) |
| `frontend` | Nginx : interface React et proxy de `/api` et `/files` vers le backend |

Commandes utiles : `docker compose logs -f backend`, `docker compose down` (les volumes sont conservés), `docker compose down -v` (supprime aussi les données).

Pour générer des secrets : `openssl rand -base64 48`.

## Démarrage sans Docker

### Prérequis

- Java 17 (JDK), Node.js 22+, PostgreSQL 17
- Maven n'a pas besoin d'être installé : le projet fournit `mvnw` / `mvnw.cmd`



### 1. Base de données

Créez une base vide (le schéma est créé automatiquement par Flyway) :

```sql
CREATE DATABASE aluni ENCODING 'UTF8';
```

### 2. Backend (port 8080)

```bash
cd backend
cp .env.example .env      # puis renseignez DB_PASSWORD, JWT_SECRET, CERT_SECRET, DEMO_PASSWORD
./mvnw spring-boot:run    # Windows : mvnw.cmd spring-boot:run
```

Le fichier `.env` contient les secrets : il est ignoré par git et ne doit jamais être partagé.

Au premier démarrage sur une base vide, des **données de démonstration** sont chargées (formations, apprenants, examens, certificats). Comptes créés, tous avec le mot de passe défini dans `DEMO_PASSWORD` :

| Rôle | Identifiant |
|---|---|
| Administrateur | `coordination@aluni.tg` |
| Formateur | `koffi@aluni.tg` |
| Apprenant | `kossi@exemple.tg` ou le téléphone `90 11 22 33` |

En production, mettez `SEED_DEMO_DATA=false` **avant** le premier démarrage et renseignez `ADMIN_EMAIL` / `ADMIN_PASSWORD` (et éventuellement `ADMIN_FIRST_NAME` / `ADMIN_LAST_NAME`) : le premier compte administrateur est alors créé automatiquement au démarrage. L'administrateur crée ensuite les autres comptes depuis la plateforme.

- Documentation de l'API (Swagger) : http://localhost:8080/api/docs/ui
- Santé du service : http://localhost:8080/actuator/health

### 3. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

En développement, Vite redirige `/api` et `/files` vers le backend (`vite.config.js`).

## Tests

```bash
cd backend
./mvnw test
```

Les tests d'intégration utilisent une base dédiée `aluni_test`, à créer une fois (`CREATE DATABASE aluni_test;`). Elle est vidée à chaque exécution.

## Mise en production (VPS)

1. `cd frontend && npm run build` → servir `frontend/dist/` avec Nginx (avec repli vers `index.html` pour les routes de l'application).
2. `cd backend && ./mvnw -DskipTests package` → lancer `java -jar target/aluni-backend-0.1.0.jar` (service systemd), avec les variables d'environnement du fichier `.env.example`.
3. Nginx : proxy de `/api/` et `/files/` vers `http://127.0.0.1:8080`, HTTPS avec Let's Encrypt.
4. Renseigner `FRONTEND_URL` (utilisé dans les QR codes des certificats) et `CORS_ORIGINS` avec le nom de domaine.
5. Sauvegardes : la base PostgreSQL (`pg_dump`) **et** le dossier `STORAGE_DIR` (supports de cours, exercices déposés).

## Fonctionnalités principales

- **Comptes** : inscription par profil (CDEJ interne, autre CDEJ, particulier, formateur soumis à validation), connexion par téléphone ou e-mail, récupération par code (SMS / e-mail), import Excel de comptes.
- **Formations** : modules et leçons (texte, vidéo, PDF, image), déblocage progressif, quiz d'entraînement, exercices pratiques corrigés par le formateur.
- **Import de documents** (espace formateur) :
  - *Cours* : un fichier Word (.docx/.doc), PowerPoint (.pptx/.ppt), PDF ou texte est découpé automatiquement en modules et leçons (titres « Titre 1 / Titre 2 » ou lignes « Module 1 : … / Leçon 1.1 : … », diapositives de section, taille des caractères pour les PDF). Texte, listes, tableaux, images et notes du présentateur sont repris ; le document original peut être joint.
  - *Questions* : un fichier Word, PDF ou texte avec des questions numérotées et des choix a), b), c)… ; bonne réponse en gras, suivie de `*` ou indiquée par « Réponse : b ». Vrai/faux, choix multiples, réponse courte et exercices pratiques sont reconnus. Aperçu avec les erreurs ligne par ligne avant création.
  - Des modèles Word sont téléchargeables depuis les fenêtres d'import.
- **Examens** : chronomètre côté serveur, tirage et mélange des questions, sauvegarde automatique (reprise après coupure), une seule session active, détection des changements d'onglet, mode « examen en salle » (adresses IP de la salle), correction automatique.
- **Certificats** : attestation de suivi et certificat de compétence, numéro unique, signature numérique HMAC, QR code, PDF officiel, vérification publique, révocation, modèles personnalisables.
- **Administration** : validations, utilisateurs, catégories, contenus du site vitrine, messages de contact, statistiques et rapports exportables (Excel / PDF).

## Envoi des SMS et e-mails

- **E-mails** : ils partent dès que `spring.mail.*` est configuré (voir `.env.example`).
- **SMS** : il faut brancher un fournisseur dans `MessageSender.sendSms`. En attendant, les messages (codes de récupération, identifiants) sont écrits dans le journal du serveur.
