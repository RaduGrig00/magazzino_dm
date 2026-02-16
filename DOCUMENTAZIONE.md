# Magazzino DM - Documentazione Completa

> Sistema di gestione magazzino ricambi sviluppato per **Data Emme S.r.l.**

---

## Indice

1. [Panoramica del Progetto](#1-panoramica-del-progetto)
2. [Architettura e Stack Tecnologico](#2-architettura-e-stack-tecnologico)
3. [Struttura del Progetto](#3-struttura-del-progetto)
4. [Backend (FastAPI / Python)](#4-backend-fastapi--python)
5. [Frontend (React / TypeScript)](#5-frontend-react--typescript)
6. [Flussi Operativi](#6-flussi-operativi)
7. [Flusso di Autenticazione](#7-flusso-di-autenticazione)
8. [Configurazione e Deploy](#8-configurazione-e-deploy)

---

## 1. Panoramica del Progetto

**Magazzino DM** e' un'applicazione web per la gestione del magazzino ricambi di Data Emme S.r.l. Il sistema consente agli operatori di:

- **Cercare articoli** tramite codice o barcode (con lettore hardware o fotocamera mobile)
- **Registrare movimenti di magazzino**: carico manuale, scarico manuale e scarico associato ad interventi tecnici
- **Monitorare le scorte** con indicatori visivi di stato (disponibile, sotto soglia, esaurito)
- **Stampare etichette** su stampante Zebra via rete, con codice e descrizione dell'articolo
- **Integrarsi con OpenSTAManager (OSM)** per la gestione interventi, clienti e impianti

L'applicazione si integra con il database MySQL di OpenSTAManager, condividendo le tabelle degli interventi (`in_interventi`), dei clienti (`an_anagrafiche`) e degli utenti (`zz_users`), aggiungendo tabelle proprie per gli articoli (`mg_articoli`) e i movimenti (`mg_movimenti`).

---

## 2. Architettura e Stack Tecnologico

### Architettura Generale

```
+------------------+       HTTP/REST       +------------------+       MySQL        +------------------+
|                  |  <------------------> |                  |  <---------------> |                  |
|     Frontend     |    JSON + Cookies     |     Backend      |    SQLAlchemy      |   Database OSM   |
|   React + Vite   |                      |     FastAPI      |                    |     (MySQL)      |
+------------------+                      +------------------+                    +------------------+
                                                  |                                       |
                                                  | TCP Socket :9100                      |
                                                  v                                       |
                                          +------------------+                            |
                                          |   Stampante      |                            |
                                          |   Zebra (ZPL)    |                            |
                                          +------------------+                            |
                                                  |                                       |
                                                  | HTTP API                              |
                                                  v                                       |
                                          +------------------+                            |
                                          |  OpenSTAManager  |  <-------------------------+
                                          |   API REST       |
                                          +------------------+
```

### Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| **Frontend** | React | 19.0.0 |
| | TypeScript | 5.6.3 |
| | Vite (build tool) | 6.0.1 |
| | Tailwind CSS | 4.1.18 |
| | React Router DOM | 7.1.0 |
| | html5-qrcode (scanner) | 2.3.8 |
| **Backend** | Python / FastAPI | - |
| | SQLAlchemy (ORM) | - |
| | python-jose (JWT) | - |
| | passlib / bcrypt | - |
| | httpx (client HTTP async) | - |
| | PyMySQL (driver MySQL) | - |
| **Database** | MySQL (OSM) | - |
| **Stampa** | Zebra ZPL via TCP | Porta 9100 |

---

## 3. Struttura del Progetto

```
magazzino_dm/
├── backend/
│   ├── .env                        # Variabili d'ambiente
│   ├── config.py                   # Configurazione DB e sessione SQLAlchemy
│   ├── main.py                     # Entry point FastAPI
│   ├── models.py                   # Modelli ORM
│   ├── schemas.py                  # Schemi Pydantic per validazione I/O
│   ├── security.py                 # Hashing e verifica password (bcrypt)
│   ├── osm_client.py               # Client asincrono API OpenSTAManager
│   ├── etichette_zebra.py          # Generazione ZPL e stampa su Zebra
│   ├── routers/
│   │   ├── auth.py                 # Autenticazione JWT
│   │   ├── articoli.py             # Endpoint articoli
│   │   ├── movimenti.py            # Endpoint movimenti di magazzino
│   │   ├── interventi.py           # Endpoint interventi
│   │   └── clienti.py              # Endpoint clienti
│   └── crud/
│       ├── crud_articolo.py        # Query articoli
│       ├── crud_movimento.py       # Creazione movimenti
│       ├── crud_interventi.py      # Query interventi
│       └── crud_clienti.py         # Query clienti
│
├── frontend/
│   └── magazzino-dm/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── public/
│       │   ├── manifest.json       # Manifest PWA
│       │   └── icons/              # Icone PWA (SVG)
│       ├── src/
│       │   ├── App.tsx             # Routing principale
│       │   ├── pages/
│       │   │   ├── Login.tsx       # Pagina di login
│       │   │   └── Home.tsx        # Pagina principale (dashboard)
│       │   ├── components/
│       │   │   ├── FormArticolo.tsx      # Form ricerca + scanner barcode
│       │   │   ├── AzioniArticolo.tsx    # Azioni: carico, scarico, intervento, stampa
│       │   │   ├── ProtectedRoute.tsx    # Wrapper autenticazione route
│       │   │   └── ui/button.tsx         # Componente Button riutilizzabile
│       │   ├── utils/auth.ts            # apiFetch con gestione token automatica
│       │   └── lib/utils.ts             # Utility (cn per classi CSS)
│       └── types/types.ts          # Interfacce TypeScript
│
└── .gitignore
```

---

## 4. Backend (FastAPI / Python)

### 4.1 Configurazione

**File:** `backend/config.py`

Connessione al database MySQL di OpenSTAManager tramite SQLAlchemy:

- **Driver**: `mysql+pymysql`
- **Pool**: `pool_size=10`, `max_overflow=20`, `pool_recycle=1800s`
- **Health check**: `pool_pre_ping=True`

**Variabili d'ambiente** (da `backend/.env`):

| Variabile | Descrizione |
|-----------|-------------|
| `DB_CHIAMATE_NAME` | Nome del database MySQL |
| `DB_CHIAMATE_HOST` | Host del server MySQL |
| `DB_CHIAMATE_PORT` | Porta MySQL (default: `3306`) |
| `DB_CHIAMATE_USER` | Utente database |
| `DB_CHIAMATE_PASSWORD` | Password database |
| `SECRET_KEY` | Chiave segreta per firma JWT |
| `ALGORITHM` | Algoritmo JWT (`HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durata access token in minuti (`30`) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Durata refresh token in giorni (`7`) |
| `PRINTER_IP` | Indirizzo IP della stampante Zebra |
| `PRINTER_PORT` | Porta TCP stampante (`9100`) |
| `BASE_URL_OSM` | URL base di OpenSTAManager |
| `TOKEN_ADMIN_OSM` | Token API amministrativo OSM |

**Entry point** (`backend/main.py`):

- **CORS**: `localhost:8080`, `192.168.0.140:8080`, `localhost:5173`
- **Middleware**: logging HTTP, gestione errori validazione
- **Documentazione**: Swagger UI (`/docs`), ReDoc (`/redoc`)

**Router registrati:**

| Prefisso | File |
|----------|------|
| `/auth` | `routers/auth.py` |
| `/articoli` | `routers/articoli.py` |
| `/movimenti` | `routers/movimenti.py` |
| `/interventi` | `routers/interventi.py` |
| `/clienti` | `routers/clienti.py` |
| `/stampa-etichette` | `etichette_zebra.py` |

---

### 4.2 Modelli di Database

**File:** `backend/models.py`

5 tabelle totali: 2 proprie del magazzino + 3 condivise con OpenSTAManager.

#### `mg_articoli` - Anagrafica articoli di ricambio

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | Integer (PK) | ID univoco |
| `codice` | String(50), unique | Codice articolo, indicizzato |
| `descrizione` | String(255) | Descrizione |
| `qta` | Numeric(15,6) | Quantita' disponibile |
| `threshold_qta` | Numeric(15,6) | Soglia minima per alert |
| `prezzo_acquisto` | Float | Prezzo di acquisto |
| `prezzo_vendita` | Float | Prezzo di vendita |
| `barcode` | String(50) | Codice a barre |
| `note` | Text | Note aggiuntive |
| `created_at` / `updated_at` | DateTime | Timestamp |

Relazione: un articolo ha molti movimenti (`cascade="all, delete-orphan"`).

#### `mg_movimenti` - Movimenti di magazzino

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | Integer (PK) | ID univoco |
| `idarticolo` | Integer (FK) | Rif. `mg_articoli.id` |
| `qta` | Numeric(15,6) | Quantita' (+carico / -scarico) |
| `movimento` | String(255) | Tipo movimento (es. "Carico Manuale") |
| `data` | Date | Data del movimento |
| `manuale` | Boolean | `True`=manuale, `False`=da intervento |
| `idintervento` | Integer (FK) | Rif. `in_interventi.id` |
| `idddt` | Integer | ID documento di trasporto |
| `iddocumento` | Integer | ID documento |
| `idsede` | Integer | ID sede |
| `reference_id` | Integer | ID riferimento generico |
| `reference_type` | String(255) | Tipo riferimento |
| `idutente` | Integer | ID utente operatore |
| `created_at` / `updated_at` | Timestamp | Auto-generati |

#### `in_interventi` - Interventi tecnici (tabella OSM)

Campi principali: `id`, `codice`, `data_richiesta`, `descrizione`, `idanagrafica` (FK), firma, date, riferimenti a preventivi/contratti/ordini. Supporta soft delete (`deleted_at`).

#### `an_anagrafiche` - Clienti (tabella OSM, alias `Cliente`)

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `idanagrafica` | Integer (PK) | ID anagrafica |
| `ragione_sociale` | String(255) | Ragione sociale |

#### `zz_users` - Utenti (tabella OSM, alias `Utente`)

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | Integer (PK) | ID utente |
| `username` | String(255), unique | Nome utente |
| `password` | String(255) | Hash bcrypt |
| `email` | String(255) | Email |
| `enabled` | Integer | 1=attivo, 0=disabilitato |

#### Diagramma Relazioni

```
mg_articoli (1) ──< (N) mg_movimenti (N) >── (1) in_interventi
                                                       |
                                                       | N
                                                       v
                                                 (1) an_anagrafiche
```

---

### 4.3 Schemi Pydantic

**File:** `backend/schemas.py`

| Schema | Utilizzo |
|--------|----------|
| `ArticoloCreate` | Creazione articolo |
| `ArticoloUpdate` | Aggiornamento parziale |
| `ArticoloResponse` | Risposta con tutti i campi + timestamp |
| `MovimentoCreate` | Creazione movimento |
| `MovimentoUpdate` | Aggiornamento parziale |
| `MovimentoResponse` | Risposta completa movimento |
| `InterventoResponse` | Intervento + `ragione_sociale` dal join |
| `ClienteResponse` | Cliente (idanagrafica, ragione_sociale) |
| `UtenteResponse` | Utente (id, username, email, enabled) |

---

### 4.4 API Endpoints

#### Autenticazione (`/auth`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login (form-data: username, password). Ritorna cookie HttpOnly |
| `GET` | `/auth/me` | Dati utente corrente (richiede cookie access_token) |
| `POST` | `/auth/refresh` | Rinnova access token tramite refresh token |
| `POST` | `/auth/logout` | Cancella cookie di autenticazione |

#### Articoli (`/articoli`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/articoli/{barcode}` | Cerca articolo per codice/barcode (protetto) |

#### Movimenti (`/movimenti`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/movimenti/` | Crea un nuovo movimento di magazzino |

Payload `MovimentoCreate`: idarticolo, qta (positiva=carico, negativa=scarico), movimento, data, manuale, idintervento, ecc.

#### Interventi (`/interventi`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/interventi/` | Ultimi 25 interventi con ragione_sociale cliente |

Join con `an_anagrafiche`, ordinati per `data_richiesta` DESC.

#### Clienti (`/clienti`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/clienti/{idanagrafica}` | Recupera cliente per ID |

#### Stampa Etichette (`/stampa-etichette`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/stampa-etichette/stampa-etichette` | Stampa etichette per articoli |

**Payload esempio:**
```json
{
  "ricambi": [
    { "codice": "ABC123", "quantita": 3 }
  ]
}
```

**Risposta:**
```json
{
  "stampati": [{"codice": "ABC123", "descrizione": "...", "fonte": "database"}],
  "errori": [],
  "totale_successo": 1,
  "totale_errori": 0
}
```

---

### 4.5 CRUD Operations

**File:** `backend/crud/`

| File | Funzione | Descrizione |
|------|----------|-------------|
| `crud_articolo.py` | `get_articolo_by_barcode(db, barcode)` | Filtra per `Articolo.codice == barcode` |
| `crud_movimento.py` | `crea_movimento(db, movimento)` | Crea record, commit e refresh |
| `crud_interventi.py` | `get_interventi_asc_order(db)` | Ultimi 25 con `joinedload(Intervento.cliente)` |
| `crud_clienti.py` | `get_cliente_by_id(db, idanagrafica)` | Filtra per `Cliente.idanagrafica` |

---

### 4.6 Sicurezza e Autenticazione

**File:** `backend/security.py`, `backend/routers/auth.py`

#### Password
- **Hashing**: bcrypt tramite `passlib.CryptContext`
- **Compatibilita' PHP**: supporta hash `$2y$` di `password_hash()` PHP (OSM)

#### Token JWT
- **Libreria**: `python-jose` con algoritmo HS256
- **Access token**: durata 30 min, payload: `{sub, uid, type: "access"}`
- **Refresh token**: durata 7 giorni, payload: `{sub, uid, type: "refresh"}`
- Entrambi salvati come **cookie HttpOnly** (`secure=False` per LAN, `samesite=Lax`)

#### Flusso backend
1. `POST /auth/login` -> verifica credenziali -> imposta cookie
2. `GET /auth/me` -> legge cookie -> decodifica JWT -> ritorna dati utente
3. `POST /auth/refresh` -> legge refresh cookie -> emette nuovo access token
4. `POST /auth/logout` -> cancella entrambi i cookie

#### Protezione endpoint
La dependency `get_current_user` legge il cookie `access_token`, decodifica il JWT e verifica il tipo. HTTP 401 se mancante/scaduto.

---

### 4.7 Client OpenSTAManager

**File:** `backend/osm_client.py`

Classe `OSMClient` - client HTTP asincrono (`httpx.AsyncClient`) per l'API REST di OpenSTAManager.

**Caratteristiche:**
- Retry con backoff esponenziale (fino a 3 tentativi, fattore 2.0)
- Gestione rate limiting (HTTP 429 con header `Retry-After`)
- Timeout: 120 secondi configurabile

**Metodi:**

| Metodo | Descrizione |
|--------|-------------|
| `get_interventi()` | Tutti gli interventi filtrati per tipo 1 o 10 |
| `create_intervento(data)` | Crea nuovo intervento |
| `get_impianto_by_matricola(matricola)` | Cerca impianto per matricola |
| `add_impianto_to_intervento(data)` | Associa impianto a intervento |
| `get_impianti_intervento(id_intervento)` | Impianti di un intervento |
| `get_cliente_by_ragione_sociale(nome)` | Cerca clienti per nome |
| `get_impianto_by_id_anagrafica(id)` | Impianti per anagrafica |
| `get_interventi_by_impianto(id)` | Interventi per impianto |

---

### 4.8 Stampa Etichette Zebra

**File:** `backend/etichette_zebra.py`

#### Formato etichetta
- **Dimensioni**: 100mm x 90mm a 203 DPI
- **Contenuto**: descrizione (fino a 3 righe, max 25 char/riga) + codice articolo
- **Testo centrato** con font ZPL 70 (descrizione) e 80 (codice)

#### Funzioni
- `generate_ricambio_zpl(codice, descrizione, marca, categoria, dpi, quantita)` - Genera codice ZPL
- `send_to_zebra(zpl_code)` - Invia ZPL via TCP socket a `PRINTER_IP:PRINTER_PORT` (timeout 5s)

---

## 5. Frontend (React / TypeScript)

### 5.1 Configurazione e Dipendenze

**Build**: Vite 6.0.1 con plugin React, Tailwind CSS 4.1.18, path alias `@` -> `src/`

**Script NPM:**

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Server sviluppo Vite |
| `npm run build` | TypeScript check + build produzione |
| `npm run lint` | ESLint |
| `npm run preview` | Anteprima build |

**Dipendenze principali:**

| Pacchetto | Utilizzo |
|-----------|----------|
| `react` / `react-dom` 19 | Framework UI |
| `react-router-dom` 7.1 | Routing |
| `html5-qrcode` 2.3.8 | Scanner barcode via fotocamera |
| `tailwind-merge` | Merge classi Tailwind |
| `class-variance-authority` | Varianti componenti |
| `@radix-ui/react-slot` | Pattern asChild |
| `react-icons` | Icone (Feather, Hero, Ant Design) |

---

### 5.2 Routing e Protezione Route

**File:** `src/App.tsx`, `src/components/ProtectedRoute.tsx`

| Path | Componente | Protetta |
|------|-----------|----------|
| `/login` | `Login` | No |
| `/` | `Home` | Si |
| `*` | Redirect a `/` | - |

**ProtectedRoute**: chiama `GET /auth/me` al mount. Se OK renderizza `<Outlet />`, altrimenti redirect a `/login`.

---

### 5.3 Pagine

#### Login (`src/pages/Login.tsx`)
- Form username/password con toggle visibilita'
- Logo aziendale, design responsive con gradiente
- Invio credenziali come `FormData` a `POST /auth/login`
- Gestione errori e stato di caricamento

#### Home (`src/pages/Home.tsx`)
- **Header**: logo, titolo "Magazzino DM", pulsante logout
- **Card benvenuto**: "Gestione Articoli" con istruzioni
- **FormArticolo**: componente principale
- **Footer**: "Data Emme S.r.l. - Magazzino DM v1.0"

---

### 5.4 Componenti

#### FormArticolo (`src/components/FormArticolo.tsx`)

Componente centrale dell'applicazione:

- **Ricerca**: campo input + pulsante "Cerca" + pulsante fotocamera (solo mobile)
- **Pulizia barcode**: rimuove prefisso "1p"/"1P" automaticamente
- **Risultato**: card con codice, descrizione, badge stato quantita':
  - Verde "Disponibile": `qta > threshold_qta`
  - Ambra "Sotto soglia": `0 < qta <= threshold_qta`
  - Rosso "Esaurito": `qta <= 0`
- **Scanner hardware**: listener globale `keydown` con threshold 50ms (intercetta lettori barcode USB/Bluetooth)
- **Scanner fotocamera**: modal con `html5-qrcode`, supporto flash, ottimizzazioni Android/iOS

#### AzioniArticolo (`src/components/AzioniArticolo.tsx`)

4 azioni disponibili su un articolo:

| Azione | Tipo | Dettagli |
|--------|------|----------|
| **Carico** | Manuale | `qta` positiva, `movimento: "Carico Manuale"` |
| **Scarico Manuale** | Manuale | `qta` negativa, `movimento: "Scarico Manuale"` |
| **Scarico Intervento** | Con intervento | Modal selezione intervento -> form quantita'. Movimento: "Scarico magazzino - Rif. attivita' num. {codice} del {data}" |
| **Stampa Etichetta** | Stampa | Modal quantita' -> `POST /stampa-etichette/stampa-etichette` |

**Caratteristiche**: validazione quantita' (1-99999), AbortController, navigazione tastiera (Enter/Escape), auto-focus.

#### Button (`src/components/ui/button.tsx`)

Componente pulsante con `class-variance-authority`:
- **Varianti**: default, destructive, outline, secondary, ghost, link, success, soft
- **Dimensioni**: xs, sm, default, lg, xl, icon, icon-sm, icon-xs
- **Props**: `loading` (spinner), `leftIcon`/`rightIcon`, `asChild`

---

### 5.5 Gestione Autenticazione (apiFetch)

**File:** `src/utils/auth.ts`

Wrapper `fetch()` con gestione automatica autenticazione:

1. Imposta `Content-Type: application/json` (eccetto FormData)
2. Invia cookie con `credentials: "include"`
3. Su HTTP 401: tenta refresh automatico (`POST /auth/refresh`), se OK ripete la richiesta, se fallisce redirect a `/login`
4. Su HTTP 429: lancia errore con messaggio server
5. Esclude endpoint auth dalla logica di auto-refresh

La variabile `VITE_API_URL` definisce l'URL base del backend.

---

### 5.6 Scanner Barcode

**Scanner hardware (USB/Bluetooth):**
- Listener globale `keydown` in `FormArticolo.tsx`
- Threshold 50ms tra tasti, lunghezza minima 3 caratteri
- Alla pressione di Enter con buffer valido, lancia la ricerca
- Funziona anche quando l'input non e' in focus

**Scanner fotocamera (mobile):**
- Libreria `html5-qrcode`
- Formati: CODE_128, CODE_39, CODE_93, EAN_13, EAN_8, UPC_A, UPC_E, ITF, CODABAR, DATA_MATRIX, QR_CODE
- Android: 1920x1080, 16:9, 10 FPS, focus continuo
- iOS: 4:3, 15 FPS
- Supporto flash/torcia opzionale

**Rilevamento dispositivo**: hook `useDeviceInfo()` - user-agent + schermo <= 768px.

---

### 5.7 PWA (Progressive Web App)

**File:** `public/manifest.json`

| Proprieta' | Valore |
|------------|--------|
| Nome | Magazzino DM |
| Display | standalone |
| Orientamento | portrait |
| Colore tema | `#1e40af` |
| Categorie | business, productivity |

Icone SVG (72x72 -> 512x512) con varianti maskable. Shortcut "Cerca Articolo".

---

## 6. Flussi Operativi

### 6.1 Ricerca Articolo

```
Utente              Frontend                 Backend                Database
  |                    |                        |                      |
  |-- Scansiona/digita |                        |                      |
  |    barcode ------->|                        |                      |
  |                    |-- GET /articoli/{cod} ->|                      |
  |                    |                        |-- SELECT mg_articoli >|
  |                    |                        |<-- Articolo row ------|
  |                    |<-- ArticoloResponse ---|                      |
  |<-- Mostra card  --|                        |                      |
  |    con dettagli    |                        |                      |
```

### 6.2 Carico Manuale

```
Utente              Frontend                 Backend                Database
  |                    |                        |                      |
  |-- Click "Carico" ->|                        |                      |
  |-- Inserisce qta -->|                        |                      |
  |-- Conferma ------->|                        |                      |
  |                    |-- POST /movimenti/ --->|                      |
  |                    |   {qta: +N,           |-- INSERT movimenti -->|
  |                    |    manuale: true}      |                      |
  |                    |<-- MovimentoResponse --|                      |
  |<-- Successo ------|                        |                      |
```

### 6.3 Scarico con Intervento

```
Utente              Frontend                 Backend                Database
  |                    |                        |                      |
  |-- Click "Scarico   |                        |                      |
  |   Intervento" ---->|                        |                      |
  |                    |-- GET /interventi/ --->|-- SELECT + JOIN ---->|
  |                    |<-- Lista interventi ---|                      |
  |<-- Modal interv. --|                        |                      |
  |-- Seleziona int. ->|                        |                      |
  |-- Inserisce qta -->|                        |                      |
  |-- Conferma ------->|                        |                      |
  |                    |-- POST /movimenti/ --->|-- INSERT movimenti ->|
  |                    |   {qta: -N,           |                      |
  |                    |    manuale: false,     |                      |
  |                    |    idintervento: ID}   |                      |
  |                    |<-- MovimentoResponse --|                      |
  |<-- Successo ------|                        |                      |
```

### 6.4 Stampa Etichette

```
Utente              Frontend                 Backend           Stampante Zebra
  |                    |                        |                      |
  |-- Click "Stampa    |                        |                      |
  |   Etichetta" ----->|                        |                      |
  |-- Inserisce qta -->|                        |                      |
  |-- Conferma ------->|                        |                      |
  |                    |-- POST /stampa-     -->|                      |
  |                    |   etichette/           |-- SELECT articolo -->|
  |                    |                        |-- Genera ZPL         |
  |                    |                        |-- TCP :9100 -------->|
  |                    |<-- {stampati: [...]} --|<-- Stampa fisica ----|
  |<-- Successo ------|                        |                      |
```

---

## 7. Flusso di Autenticazione

```
                         PRIMA VISITA
                              |
                              v
                    ProtectedRoute
                    GET /auth/me (cookie)
                              |
                    +---------+---------+
                    |                   |
                OK (200)          ERRORE (401)
                    |                   |
                    v                   v
                  Home              Login Page
                                        |
                                        v
                              POST /auth/login
                              (username + password)
                                        |
                              +---------+---------+
                              |                   |
                         OK (200)           ERRORE (401)
                         Set cookies:       Mostra errore
                         - access_token
                         - refresh_token
                              |
                              v
                         Redirect a /

                    DURANTE L'USO
                    apiFetch() intercetta 401:
                              |
                    POST /auth/refresh
                              |
                    +---------+---------+
                    |                   |
               OK: nuovo           FALLITO:
               access_token        redirect /login
               ripete richiesta
```

---

## 8. Configurazione e Deploy

### 8.1 Prerequisiti

- **Python** 3.10+
- **Node.js** 18+ e npm
- **MySQL** (database OpenSTAManager esistente)
- **Stampante Zebra** raggiungibile in rete (porta 9100)

### 8.2 Backend

1. Creare `backend/.env` con le variabili della [sezione 4.1](#41-configurazione)

2. Installare dipendenze:
   ```bash
   cd backend
   pip install fastapi uvicorn sqlalchemy pymysql python-jose passlib[bcrypt] httpx python-dotenv pydantic requests
   ```

3. Avviare:
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

   - API: `http://localhost:8000`
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### 8.3 Frontend

1. Creare `.env` nella cartella `frontend/magazzino-dm/`:
   ```
   VITE_API_URL=http://localhost:8000
   ```

2. Installare dipendenze:
   ```bash
   cd frontend/magazzino-dm
   npm install
   ```

3. Sviluppo:
   ```bash
   npm run dev
   ```
   Disponibile su `http://localhost:5173`

4. Produzione:
   ```bash
   npm run build
   ```
   Output in `dist/`

### 8.4 Note di Deploy

- **CORS**: aggiornare `origins` in `backend/main.py` per ambienti di produzione
- **Cookie secure**: impostare `secure=True` se si usa HTTPS
- **Stampante**: deve essere raggiungibile da `PRINTER_IP` sulla porta `PRINTER_PORT`

---

*Documentazione del progetto Magazzino DM - Data Emme S.r.l.*
