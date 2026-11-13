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
5. Sauvegardes : la base PostgreSQL (`pg_dump`) **et** le dossier `STORAGE_DIR` (supports de cours, images).

## Fonctionnalités principales

- **Comptes** : inscription par profil (CDEJ interne, autre CDEJ, particulier) ; les formateurs, recrutés par le CDEJ, ont un compte créé par l'administration (pas d'inscription formateur sur le site), connexion par téléphone ou e-mail, récupération par code (SMS / e-mail), import Excel de comptes.
- **Formations** : modules et leçons (texte, vidéo, PDF, image), déblocage progressif, quiz d'entraînement corrigés automatiquement. Le formateur publie lui-même sa formation : elle est visible immédiatement dans le catalogue (l'administration peut l'archiver si besoin). Le formateur fournit les questions **et leurs réponses** (saisie ou import Word) : il n'a aucune copie à corriger.
- **Import de documents** (espace formateur) :
  - *Cours* : un fichier Word (.docx/.doc), PowerPoint (.pptx/.ppt), PDF ou texte est découpé automatiquement en modules et leçons (titres « Titre 1 / Titre 2 » ou lignes « Module 1 : … / Leçon 1.1 : … », diapositives de section, taille des caractères pour les PDF). Texte, listes, tableaux, images et notes du présentateur sont repris ; le document original peut être joint.
  - *Questions* : un fichier Word, PDF ou texte avec des questions numérotées et des choix a), b), c)… ; bonne réponse en gras, suivie de `*` ou indiquée par « Réponse : b ». Vrai/faux, choix multiples, réponse courte et exercices pratiques sont reconnus. Aperçu avec les erreurs ligne par ligne avant création.
  - Des modèles Word sont téléchargeables depuis les fenêtres d'import.
- **Examens** : chronomètre côté serveur, tirage et mélange des questions, sauvegarde automatique (reprise après coupure), une seule session active, détection des changements d'onglet, mode « examen en salle » (adresses IP de la salle), correction automatique. Deux modalités par inscription : **en salle** (apprenants du CDEJ : support de cours PDF, examen lors d'une session programmée par le formateur avec un créneau horaire, une seule tentative) et **en ligne** (autres CDEJ et particuliers : modules suivis à son rythme, examen ouvert à tout moment une fois les modules terminés, tentatives illimitées jusqu'à la réussite). Le formateur peut changer la modalité d'un apprenant.
- **Certificats** : attestation de suivi et certificat de compétence, numéro unique, signature numérique HMAC, QR code, PDF officiel, vérification publique, révocation, modèles personnalisables.
- **Administration** : création des comptes formateurs, réinitialisation des mots de passe, validations (inscriptions, certificats), archivage des formations, utilisateurs, catégories, contenus du site vitrine, messages de contact, statistiques et rapports exportables (Excel / PDF).

## Envoi des SMS et e-mails

Les codes de récupération du mot de passe et les identifiants des nouveaux comptes partent par SMS ou par e-mail. Chaque canal s'active dès que ses paramètres sont renseignés dans `backend/.env` (modèle commenté dans `.env.example`) :

- **E-mails** (SMTP, par exemple Gmail avec un mot de passe d'application) : `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`. Les messages partent en HTML aux couleurs d'ALuNI.
- **SMS** (Twilio) : `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. Les numéros togolais à 8 chiffres sont envoyés au format international (+228…).

La page « Mot de passe oublié » ne propose que les canaux actifs. Si aucun n'est configuré, elle invite à contacter l'Académie : l'administrateur peut alors **réinitialiser le mot de passe** depuis *Utilisateurs* (un mot de passe provisoire est affiché et envoyé à la personne si possible). En développement, `MESSAGES_LOG_ONLY=true` simule les envois en écrivant les codes dans le journal du serveur.

## Assistant de la plateforme (chatbot)

Le bouton **« Une question ? »** (site public et espaces connectés) ouvre un assistant qui explique le fonctionnement de la plateforme. Il tient compte du profil connecté (visiteur, apprenant, formateur, administrateur) et signale quand une fonction est réservée à un autre profil.

- **Avec une clé de l'API Claude** (`ANTHROPIC_API_KEY` dans `backend/.env`) : les réponses sont rédigées par Claude à partir du guide `backend/src/main/resources/assistant/guide.md`, de la FAQ, du catalogue et des coordonnées de l'Académie, lus en direct.
- **Sans clé**, ou si le service est indisponible : l'assistant répond avec les fiches d'aide par profil (`assistant/fiches.md`) et la FAQ.
- Chaque visiteur est limité à `ASSISTANT_MESSAGES_PER_HOUR` messages par heure (30 par défaut). La clé reste sur le serveur, jamais dans le navigateur.
