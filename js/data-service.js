import {
  firebaseConfig,
  firebaseIsConfigured,
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD
} from "./config.js";

const STORAGE_KEY = "rvSportsDemoDataV1";
const SESSION_KEY = "rvSportsDemoAdmin";
const demoListeners = { game: new Set(), polls: new Set(), auth: new Set() };
let firebaseApi = null;

const initialDemoData = {
  game: {
    title: "Copa do Bairro • Rodada 1",
    home: "União FC",
    away: "Vila Real",
    homeScore: 1,
    awayScore: 1,
    status: "AO VIVO",
    clock: "32' • 2º tempo",
    venue: "Campo Municipal",
    homeImage: "",
    awayImage: ""
  },
  polls: {
    previsao: {
      question: "Quem vai vencer o jogo de hoje?",
      active: true,
      createdAt: 1,
      options: {
        casa: { label: "União FC", votes: 18 },
        empate: { label: "Empate", votes: 7 },
        fora: { label: "Vila Real", votes: 13 }
      }
    },
    melhor: {
      question: "Quem está sendo o melhor jogador da rodada?",
      active: true,
      createdAt: 2,
      options: {
        joao: { label: "João", votes: 12 },
        lucas: { label: "Lucas", votes: 20 },
        matheus: { label: "Matheus", votes: 9 },
        pedro: { label: "Pedro", votes: 5 }
      }
    },
    pior: {
      question: "Quem está devendo futebol hoje?",
      active: true,
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDemoData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDemoData));
    return clone(initialDemoData);
  }
  try {
    return JSON.parse(saved);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDemoData));
    return clone(initialDemoData);
  }
}

function setDemoData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyDemo();
}

function demoPollArray(data = getDemoData()) {
  return Object.entries(data.polls || {})
    .map(([id, poll]) => ({ id, ...poll }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function notifyDemo() {
  const data = getDemoData();
  demoListeners.game.forEach((callback) => callback(clone(data.game)));
  const polls = demoPollArray(data);
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

function normalizePolls(rawPolls) {
  return Object.entries(rawPolls || {})
    .map(([id, poll]) => ({ id, ...poll }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
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

export const dataService = {
  isDemo: !firebaseIsConfigured,

  async subscribeGame(callback) {
    if (!firebaseIsConfigured) {
      demoListeners.game.add(callback);
      callback(clone(getDemoData().game));
      return () => demoListeners.game.delete(callback);
    }

    const { db, ref, onValue } = await loadFirebase();
    return onValue(ref(db, "game"), (snapshot) => callback(snapshot.val() || {}));
  },

  async subscribePolls(callback) {
    if (!firebaseIsConfigured) {
      demoListeners.polls.add(callback);
      callback(clone(demoPollArray()));
      return () => demoListeners.polls.delete(callback);
    }

    const { db, ref, onValue } = await loadFirebase();
    return onValue(ref(db, "polls"), (snapshot) => callback(normalizePolls(snapshot.val())));
  },

  async vote(pollId, optionId) {
    if (!firebaseIsConfigured) {
      const data = getDemoData();
      const option = data.polls?.[pollId]?.options?.[optionId];
      if (!option) throw new Error("Opção não encontrada.");
      option.votes = Number(option.votes || 0) + 1;
      setDemoData(data);
      return;
    }

    const { db, ref, runTransaction } = await loadFirebase();
    const voteRef = ref(db, `polls/${pollId}/options/${optionId}/votes`);
    await runTransaction(voteRef, (current) => Number(current || 0) + 1);
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
    const cleanGame = {
      title: String(game.title || "Copa do Bairro"),
      home: String(game.home || "Time da casa"),
      away: String(game.away || "Time visitante"),
      homeScore: Math.max(0, Number(game.homeScore || 0)),
      awayScore: Math.max(0, Number(game.awayScore || 0)),
      status: String(game.status || "PRÉ-JOGO"),
      clock: String(game.clock || ""),
      venue: String(game.venue || ""),
      homeImage: String(game.homeImage || ""),
      awayImage: String(game.awayImage || "")
    };

    if (!firebaseIsConfigured) {
      const data = getDemoData();
      data.game = cleanGame;
      setDemoData(data);
      return;
    }

    const { db, ref, set } = await loadFirebase();
    await set(ref(db, "game"), cleanGame);
  },

  async savePoll({ id, question, options, active }) {
    const optionObject = {};
    options.forEach((label, index) => {
      optionObject[slugify(label, index)] = { label, votes: 0 };
    });

    const poll = {
      question: String(question),
      active: Boolean(active),
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

  async setPollActive(pollId, active) {
    if (!firebaseIsConfigured) {
      const data = getDemoData();
      if (!data.polls[pollId]) throw new Error("Votação não encontrada.");
      data.polls[pollId].active = Boolean(active);
      setDemoData(data);
      return;
    }

    const { db, ref, set } = await loadFirebase();
    await set(ref(db, `polls/${pollId}/active`), Boolean(active));
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
