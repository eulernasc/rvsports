import {
  firebaseConfig,
  firebaseIsConfigured,
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD
} from "./config.js";

const STORAGE_KEY = "rvSportsDemoDataV2";
const LEGACY_STORAGE_KEY = "rvSportsDemoDataV1";
const SESSION_KEY = "rvSportsDemoAdmin";
const demoListeners = { games: new Set(), polls: new Set(), auth: new Set() };
let firebaseApi = null;

function localIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createInitialDemoData() {
  const today = localIsoDate();
  return {
    games: {
      "final-1": {
        title: "Copa do Bairro • Rodada 1",
        date: today,
        time: "09:00",
        venue: "Campo Municipal",
        home: "União FC",
        away: "Vila Real",
        homeScore: 2,
        awayScore: 1,
        homeImage: "",
        awayImage: "",
        createdAt: 1
      },
      "final-2": {
        title: "Copa do Bairro • Rodada 1",
        date: today,
        time: "11:00",
        venue: "Campo Municipal",
        home: "Estrela Azul",
        away: "Real Bairro",
        homeScore: 0,
        awayScore: 0,
        homeImage: "",
        awayImage: "",
        createdAt: 2
      }
    },
    polls: {
      previsao: {
        question: "Qual foi o melhor time da rodada?",
        active: true,
        showResults: false,
        createdAt: 1,
        options: {
          uniao: { label: "União FC", votes: 18 },
          vila: { label: "Vila Real", votes: 13 },
          estrela: { label: "Estrela Azul", votes: 7 }
        }
      },
      melhor: {
        question: "Quem foi o melhor jogador da rodada?",
        active: true,
        showResults: false,
        createdAt: 2,
        options: {
          joao: { label: "João", votes: 12 },
          lucas: { label: "Lucas", votes: 20 },
          matheus: { label: "Matheus", votes: 9 },
          pedro: { label: "Pedro", votes: 5 }
        }
      },
      pior: {
        question: "Quem ficou devendo futebol hoje?",
        active: true,
        showResults: false,
        createdAt: 3,
        options: {
          joao: { label: "João", votes: 4 },
          lucas: { label: "Lucas", votes: 3 },
          matheus: { label: "Matheus", votes: 11 },
          pedro: { label: "Pedro", votes: 8 }
        }
      }
    }
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrateLegacyData() {
  const fallback = createInitialDemoData();
  const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacySaved) return fallback;

  try {
    const legacy = JSON.parse(legacySaved);
    const games = {};
    if (legacy.game && Object.keys(legacy.game).length) {
      games["placar-migrado"] = {
        title: String(legacy.game.title || "Copa do Bairro"),
        date: localIsoDate(),
        time: "",
        venue: String(legacy.game.venue || ""),
        home: String(legacy.game.home || "Time da casa"),
        away: String(legacy.game.away || "Time visitante"),
        homeScore: Math.max(0, Number(legacy.game.homeScore || 0)),
        awayScore: Math.max(0, Number(legacy.game.awayScore || 0)),
        homeImage: String(legacy.game.homeImage || ""),
        awayImage: String(legacy.game.awayImage || ""),
        createdAt: Date.now()
      };
    } else {
      Object.assign(games, fallback.games);
    }
    return {
      games,
      polls: legacy.polls && Object.keys(legacy.polls).length ? legacy.polls : fallback.polls
    };
  } catch {
    return fallback;
  }
}

function normalizeDemoData(data) {
  const fallback = createInitialDemoData();
  return {
    games: data?.games && typeof data.games === "object" ? data.games : fallback.games,
    polls: data?.polls && typeof data.polls === "object" ? data.polls : fallback.polls
  };
}

function getDemoData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const migrated = migrateLegacyData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return clone(migrated);
  }

  try {
    const parsed = normalizeDemoData(JSON.parse(saved));
    return parsed;
  } catch {
    const fallback = createInitialDemoData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return clone(fallback);
  }
}

function setDemoData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyDemo();
}

function normalizeGames(rawGames) {
  return Object.entries(rawGames || {})
    .map(([id, game]) => ({ id, ...game }))
    .sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
      if (dateCompare !== 0) return dateCompare;
      const timeCompare = String(b.time || "").localeCompare(String(a.time || ""));
      if (timeCompare !== 0) return timeCompare;
      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    });
}

function normalizePolls(rawPolls) {
  return Object.entries(rawPolls || {})
    .map(([id, poll]) => ({
      id,
      ...poll,
      active: Boolean(poll?.active),
      showResults: Boolean(poll?.showResults)
    }))
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function notifyDemo() {
  const data = getDemoData();
  const games = normalizeGames(data.games);
  const polls = normalizePolls(data.polls);
  demoListeners.games.forEach((callback) => callback(clone(games)));
  demoListeners.polls.forEach((callback) => callback(clone(polls)));
}

function notifyDemoAuth() {
  const user = sessionStorage.getItem(SESSION_KEY)
    ? { email: DEMO_ADMIN_EMAIL, demo: true }
    : null;
  demoListeners.auth.forEach((callback) => callback(user));
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) notifyDemo();
  if (event.key === SESSION_KEY) notifyDemoAuth();
});

async function loadFirebase() {
  if (firebaseApi) return firebaseApi;

  const [appModule, dbModule, authModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js"),
    import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js")
  ]);

  const app = appModule.initializeApp(firebaseConfig);
  const db = dbModule.getDatabase(app);
  const auth = authModule.getAuth(app);

  firebaseApi = { ...dbModule, ...authModule, db, auth };
  return firebaseApi;
}

function slugify(text, index) {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `${slug || "opcao"}-${index + 1}`;
}

function cleanGame(game, createdAt = Date.now()) {
  return {
    title: String(game.title || "Copa do Bairro"),
    date: String(game.date || localIsoDate()),
    time: String(game.time || ""),
    venue: String(game.venue || ""),
    home: String(game.home || "Time da casa"),
    away: String(game.away || "Time visitante"),
    homeScore: Math.max(0, Number(game.homeScore || 0)),
    awayScore: Math.max(0, Number(game.awayScore || 0)),
    homeImage: String(game.homeImage || ""),
    awayImage: String(game.awayImage || ""),
    createdAt: Number(createdAt || Date.now())
  };
}

export const dataService = {
  isDemo: !firebaseIsConfigured,

  async subscribeGames(callback) {
    if (!firebaseIsConfigured) {
      demoListeners.games.add(callback);
      callback(clone(normalizeGames(getDemoData().games)));
      return () => demoListeners.games.delete(callback);
    }

    const { db, ref, onValue } = await loadFirebase();
    return onValue(ref(db, "games"), (snapshot) => callback(normalizeGames(snapshot.val())));
  },

  async subscribePolls(callback) {
    if (!firebaseIsConfigured) {
      demoListeners.polls.add(callback);
      callback(clone(normalizePolls(getDemoData().polls)));
      return () => demoListeners.polls.delete(callback);
    }

    const { db, ref, onValue } = await loadFirebase();
    return onValue(ref(db, "polls"), (snapshot) => callback(normalizePolls(snapshot.val())));
  },

  async vote(pollId, optionId) {
    if (!firebaseIsConfigured) {
      const data = getDemoData();
      const poll = data.polls?.[pollId];
      if (!poll?.active) throw new Error("Esta votação já foi encerrada.");
      const option = poll.options?.[optionId];
      if (!option) throw new Error("Opção não encontrada.");
      option.votes = Number(option.votes || 0) + 1;
      setDemoData(data);
      return;
    }

    const { db, ref, get, runTransaction } = await loadFirebase();
    const activeSnapshot = await get(ref(db, `polls/${pollId}/active`));
    if (activeSnapshot.val() !== true) throw new Error("Esta votação já foi encerrada.");

    const voteRef = ref(db, `polls/${pollId}/options/${optionId}/votes`);
    const transaction = await runTransaction(voteRef, (current) => Number(current || 0) + 1);
    if (!transaction.committed) throw new Error("Não foi possível registrar o voto.");
  },

  async login(email, password) {
    if (!firebaseIsConfigured) {
      if (email.trim().toLowerCase() !== DEMO_ADMIN_EMAIL || password !== DEMO_ADMIN_PASSWORD) {
        throw new Error("E-mail ou senha incorretos no modo demonstração.");
      }
      sessionStorage.setItem(SESSION_KEY, "1");
      notifyDemoAuth();
      return { email: DEMO_ADMIN_EMAIL, demo: true };
    }

    const { auth, signInWithEmailAndPassword } = await loadFirebase();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  },

  async logout() {
    if (!firebaseIsConfigured) {
      sessionStorage.removeItem(SESSION_KEY);
      notifyDemoAuth();
      return;
    }

    const { auth, signOut } = await loadFirebase();
    await signOut(auth);
  },

  async onAuthChange(callback) {
    if (!firebaseIsConfigured) {
      demoListeners.auth.add(callback);
      notifyDemoAuth();
      return () => demoListeners.auth.delete(callback);
    }

    const { auth, onAuthStateChanged } = await loadFirebase();
    return onAuthStateChanged(auth, callback);
  },

  async saveGame(game) {
    if (!firebaseIsConfigured) {
      const data = getDemoData();
      const id = game.id || `game-${Date.now()}`;
      const existingCreatedAt = data.games?.[id]?.createdAt;
      data.games[id] = cleanGame(game, existingCreatedAt || game.createdAt || Date.now());
      setDemoData(data);
      return id;
    }

    const { db, ref, set, push, get } = await loadFirebase();
    let gameRef;
    let createdAt = game.createdAt || Date.now();

    if (game.id) {
      gameRef = ref(db, `games/${game.id}`);
      const snapshot = await get(gameRef);
      createdAt = snapshot.val()?.createdAt || createdAt;
    } else {
      gameRef = push(ref(db, "games"));
    }

    await set(gameRef, cleanGame(game, createdAt));
    return gameRef.key;
  },

  async deleteGame(gameId) {
    if (!firebaseIsConfigured) {
      const data = getDemoData();
      delete data.games[gameId];
      setDemoData(data);
      return;
    }

    const { db, ref, remove } = await loadFirebase();
    await remove(ref(db, `games/${gameId}`));
  },

  async savePoll({ id, question, options, active }) {
    const optionObject = {};
    options.forEach((label, index) => {
      optionObject[slugify(label, index)] = { label, votes: 0 };
    });

    const poll = {
      question: String(question),
      active: Boolean(active),
      showResults: false,
      closedAt: null,
      createdAt: Date.now(),
      options: optionObject
    };

    if (!firebaseIsConfigured) {
      const data = getDemoData();
      const pollId = id || `poll-${Date.now()}`;
      data.polls[pollId] = poll;
      setDemoData(data);
      return pollId;
    }

    const { db, ref, set, push } = await loadFirebase();
    const pollRef = id ? ref(db, `polls/${id}`) : push(ref(db, "polls"));
    await set(pollRef, poll);
    return pollRef.key;
  },

  async setPollState(pollId, { active, showResults }) {
    const state = {
      active: Boolean(active),
      showResults: Boolean(showResults),
      closedAt: !active && showResults ? Date.now() : null
    };

    if (!firebaseIsConfigured) {
      const data = getDemoData();
      if (!data.polls[pollId]) throw new Error("Votação não encontrada.");
      Object.assign(data.polls[pollId], state);
      setDemoData(data);
      return;
    }

    const { db, ref, update } = await loadFirebase();
    await update(ref(db, `polls/${pollId}`), state);
  },

  async setPollActive(pollId, active) {
    return this.setPollState(pollId, { active, showResults: false });
  },

  async resetPoll(pollId) {
    if (!firebaseIsConfigured) {
      const data = getDemoData();
      const options = data.polls?.[pollId]?.options;
      if (!options) throw new Error("Votação não encontrada.");
      Object.values(options).forEach((option) => { option.votes = 0; });
      setDemoData(data);
      return;
    }

    const { db, ref, get, update } = await loadFirebase();
    const optionsRef = ref(db, `polls/${pollId}/options`);
    const snapshot = await get(optionsRef);
    const updates = {};
    Object.keys(snapshot.val() || {}).forEach((optionId) => {
      updates[`${optionId}/votes`] = 0;
    });
    await update(optionsRef, updates);
  },

  async deletePoll(pollId) {
    if (!firebaseIsConfigured) {
      const data = getDemoData();
      delete data.polls[pollId];
      setDemoData(data);
      return;
    }

    const { db, ref, remove } = await loadFirebase();
    await remove(ref(db, `polls/${pollId}`));
  }
};
