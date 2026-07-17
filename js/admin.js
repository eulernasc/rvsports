import { dataService } from "./data-service.js";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "./config.js";

const $ = (selector) => document.querySelector(selector);

const elements = {
  loginSection: $("#loginSection"),
  loginForm: $("#loginForm"),
  loginEmail: $("#loginEmail"),
  loginPassword: $("#loginPassword"),
  loginMessage: $("#loginMessage"),
  demoHint: $("#demoHint"),
  dashboard: $("#adminDashboard"),
  logoutButton: $("#logoutButton"),
  adminModeText: $("#adminModeText"),
  adminModeBadge: $("#adminModeBadge"),
  gameForm: $("#gameForm"),
  gameMessage: $("#gameMessage"),
  homeImageInput: $("#homeImageInput"),
  awayImageInput: $("#awayImageInput"),
  homeImagePreview: $("#homeImagePreview"),
  awayImagePreview: $("#awayImagePreview"),
  removeHomeImageButton: $("#removeHomeImageButton"),
  removeAwayImageButton: $("#removeAwayImageButton"),
  pollForm: $("#pollForm"),
  pollFormTitle: $("#pollFormTitle"),
  pollSubmitButton: $("#pollSubmitButton"),
  pollMessage: $("#pollMessage"),
  cancelEditButton: $("#cancelEditButton"),
  editWarning: $("#editWarning"),
  adminPollList: $("#adminPollList"),
  toast: $("#toast")
};

let currentPolls = [];
let gameLoadedOnce = false;
const teamImages = { home: "", away: "" };
const teamImageDirty = { home: false, away: false };

function setMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "RV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function isSafeImageSource(value = "") {
  return /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) || /^https:\/\//i.test(value);
}

function renderImagePreview(side) {
  const preview = side === "home" ? elements.homeImagePreview : elements.awayImagePreview;
  const nameInput = side === "home" ? $("#homeNameInput") : $("#awayNameInput");
  const source = teamImages[side];
  preview.replaceChildren();

  if (isSafeImageSource(source)) {
    const image = document.createElement("img");
    image.src = source;
    image.alt = `Prévia do escudo do ${nameInput.value || "time"}`;
    preview.appendChild(image);
    preview.classList.add("has-image");
  } else {
    const fallback = document.createElement("span");
    fallback.textContent = initials(nameInput.value);
    preview.appendChild(fallback);
    preview.classList.remove("has-image");
  }
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não foi possível abrir esta imagem."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler esta imagem."));
    reader.readAsDataURL(file);
  });
}

async function compressTeamImage(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Escolha uma imagem PNG, JPG ou WEBP.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 8 MB.");
  }

  const image = await loadImageFile(file);
  const maxDimension = 420;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Seu navegador não conseguiu processar a imagem.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  let result = canvas.toDataURL("image/webp", 0.84);
  if (result.length > 360000) result = canvas.toDataURL("image/webp", 0.68);
  if (result.length > 480000) {
    throw new Error("A imagem ainda ficou muito pesada. Escolha outra mais simples.");
  }
  return result;
}

async function handleTeamImageSelection(side, file) {
  if (!file) return;
  setMessage(elements.gameMessage, "Preparando imagem...");
  try {
    teamImages[side] = await compressTeamImage(file);
    teamImageDirty[side] = true;
    renderImagePreview(side);
    setMessage(elements.gameMessage, "Imagem pronta. Clique em salvar para publicar.", "success");
  } catch (error) {
    console.error(error);
    setMessage(elements.gameMessage, error.message || "Não foi possível processar a imagem.", "error");
  }
}

function removeTeamImage(side) {
  teamImages[side] = "";
  teamImageDirty[side] = true;
  const input = side === "home" ? elements.homeImageInput : elements.awayImageInput;
  input.value = "";
  renderImagePreview(side);
  setMessage(elements.gameMessage, "Escudo removido. Clique em salvar para confirmar.");
}

function fillGameForm(game) {
  if (!game || !Object.keys(game).length) return;
  $("#gameTitleInput").value = game.title || "";
  $("#homeNameInput").value = game.home || "";
  $("#awayNameInput").value = game.away || "";
  $("#homeScoreInput").value = Number(game.homeScore || 0);
  $("#awayScoreInput").value = Number(game.awayScore || 0);
  $("#gameStatusInput").value = game.status || "PRÉ-JOGO";
  $("#gameClockInput").value = game.clock || "";
  $("#gameVenueInput").value = game.venue || "";
  if (!teamImageDirty.home) teamImages.home = game.homeImage || "";
  if (!teamImageDirty.away) teamImages.away = game.awayImage || "";
  renderImagePreview("home");
  renderImagePreview("away");
  gameLoadedOnce = true;
}

function resetPollForm() {
  elements.pollForm.reset();
  $("#pollIdInput").value = "";
  $("#pollActiveInput").checked = true;
  elements.pollFormTitle.textContent = "Criar votação";
  elements.pollSubmitButton.textContent = "Criar votação";
  elements.cancelEditButton.classList.add("hidden");
  elements.editWarning.classList.add("hidden");
  setMessage(elements.pollMessage, "");
}

function startPollEdit(poll) {
  $("#pollIdInput").value = poll.id;
  $("#pollQuestionInput").value = poll.question || "";
  $("#pollOptionsInput").value = Object.values(poll.options || {}).map((option) => option.label).join("\n");
  $("#pollActiveInput").checked = Boolean(poll.active);
  elements.pollFormTitle.textContent = "Editar votação";
  elements.pollSubmitButton.textContent = "Salvar e zerar votos";
  elements.cancelEditButton.classList.remove("hidden");
  elements.editWarning.classList.remove("hidden");
  elements.pollForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderAdminPolls(polls) {
  currentPolls = polls;
  if (!polls.length) {
    elements.adminPollList.innerHTML = '<div class="empty-state">Nenhuma votação cadastrada.</div>';
    return;
  }

  elements.adminPollList.innerHTML = polls.map((poll) => {
    const total = Object.values(poll.options || {}).reduce((sum, option) => sum + Number(option.votes || 0), 0);
    const optionCount = Object.keys(poll.options || {}).length;
    return `
      <article class="admin-poll-item">
        <div>
          <h3>${escapeHtml(poll.question)}</h3>
          <p><span class="status-dot ${poll.active ? "" : "inactive"}">${poll.active ? "Visível" : "Oculta"}</span> • ${optionCount} opções • ${total} votos</p>
        </div>
        <div class="admin-actions">
          <button class="button button-secondary" type="button" data-action="edit" data-id="${escapeHtml(poll.id)}">Editar</button>
          <button class="button button-secondary" type="button" data-action="toggle" data-id="${escapeHtml(poll.id)}">${poll.active ? "Ocultar" : "Publicar"}</button>
          <button class="button button-secondary" type="button" data-action="reset" data-id="${escapeHtml(poll.id)}">Zerar votos</button>
          <button class="button button-danger" type="button" data-action="delete" data-id="${escapeHtml(poll.id)}">Excluir</button>
        </div>
      </article>`;
  }).join("");
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(elements.loginMessage, "Entrando...");
  const submitButton = elements.loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  try {
    await dataService.login(elements.loginEmail.value, elements.loginPassword.value);
    setMessage(elements.loginMessage, "Acesso liberado.", "success");
  } catch (error) {
    console.error(error);
    setMessage(elements.loginMessage, error.message || "Não foi possível entrar.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await dataService.logout();
});

elements.homeImageInput.addEventListener("change", () => {
  handleTeamImageSelection("home", elements.homeImageInput.files?.[0]);
});

elements.awayImageInput.addEventListener("change", () => {
  handleTeamImageSelection("away", elements.awayImageInput.files?.[0]);
});

elements.removeHomeImageButton.addEventListener("click", () => removeTeamImage("home"));
elements.removeAwayImageButton.addEventListener("click", () => removeTeamImage("away"));

$("#homeNameInput").addEventListener("input", () => {
  if (!teamImages.home) renderImagePreview("home");
});

$("#awayNameInput").addEventListener("input", () => {
  if (!teamImages.away) renderImagePreview("away");
});

document.querySelectorAll("[data-score-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.scoreTarget);
    const next = Math.max(0, Number(input.value || 0) + Number(button.dataset.delta));
    input.value = next;
  });
});

elements.gameForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(elements.gameMessage, "Salvando...");
  try {
    await dataService.saveGame({
      title: $("#gameTitleInput").value,
      home: $("#homeNameInput").value,
      away: $("#awayNameInput").value,
      homeScore: $("#homeScoreInput").value,
      awayScore: $("#awayScoreInput").value,
      status: $("#gameStatusInput").value,
      clock: $("#gameClockInput").value,
      venue: $("#gameVenueInput").value,
      homeImage: teamImages.home,
      awayImage: teamImages.away
    });
    teamImageDirty.home = false;
    teamImageDirty.away = false;
    setMessage(elements.gameMessage, "Placar atualizado com sucesso.", "success");
    showToast("Placar e escudos atualizados no site.");
  } catch (error) {
    console.error(error);
    setMessage(elements.gameMessage, "Não foi possível salvar. Confira o login e as regras do banco.", "error");
  }
});

elements.pollForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const options = $("#pollOptionsInput").value
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  if (options.length < 2) {
    setMessage(elements.pollMessage, "Coloque pelo menos duas opções.", "error");
    return;
  }

  setMessage(elements.pollMessage, "Salvando...");
  try {
    await dataService.savePoll({
      id: $("#pollIdInput").value || null,
      question: $("#pollQuestionInput").value.trim(),
      options,
      active: $("#pollActiveInput").checked
    });
    setMessage(elements.pollMessage, "Votação salva.", "success");
    showToast("Votação salva com sucesso.");
    resetPollForm();
  } catch (error) {
    console.error(error);
    setMessage(elements.pollMessage, "Não foi possível salvar a votação.", "error");
  }
});

elements.cancelEditButton.addEventListener("click", resetPollForm);

elements.adminPollList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const poll = currentPolls.find((item) => item.id === button.dataset.id);
  if (!poll) return;

  const action = button.dataset.action;
  if (action === "edit") {
    startPollEdit(poll);
    return;
  }

  button.disabled = true;
  try {
    if (action === "toggle") {
      await dataService.setPollActive(poll.id, !poll.active);
      showToast(poll.active ? "Votação ocultada." : "Votação publicada.");
    }

    if (action === "reset") {
      const confirmed = window.confirm("Zerar todos os votos desta enquete?");
      if (!confirmed) return;
      await dataService.resetPoll(poll.id);
      showToast("Votos zerados.");
    }

    if (action === "delete") {
      const confirmed = window.confirm("Excluir esta votação definitivamente?");
      if (!confirmed) return;
      await dataService.deletePoll(poll.id);
      showToast("Votação excluída.");
      if ($("#pollIdInput").value === poll.id) resetPollForm();
    }
  } catch (error) {
    console.error(error);
    showToast("A ação não pôde ser concluída.");
  } finally {
    button.disabled = false;
  }
});

if (dataService.isDemo) {
  elements.demoHint.textContent = `Modo demonstração: use ${DEMO_ADMIN_EMAIL} e senha ${DEMO_ADMIN_PASSWORD}. Os dados ficam somente neste navegador.`;
  elements.adminModeBadge.textContent = "Demonstração";
  elements.adminModeText.textContent = "Os dados estão salvos apenas neste navegador. Configure o Firebase para publicar de verdade.";
} else {
  elements.demoHint.classList.add("hidden");
  elements.adminModeBadge.textContent = "Firebase online";
  elements.adminModeText.textContent = "Alterações sincronizadas em tempo real com o site público.";
}

dataService.onAuthChange((user) => {
  const loggedIn = Boolean(user);
  elements.loginSection.classList.toggle("hidden", loggedIn);
  elements.dashboard.classList.toggle("hidden", !loggedIn);
  if (loggedIn) {
    elements.loginPassword.value = "";
  }
}).catch((error) => {
  console.error(error);
  setMessage(elements.loginMessage, "Erro ao verificar o login.", "error");
});

dataService.subscribeGame((game) => {
  const editingTextField = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  const hasPendingImage = teamImageDirty.home || teamImageDirty.away;
  if (!gameLoadedOnce || (!editingTextField && !hasPendingImage)) {
    fillGameForm(game);
  }
}).catch(console.error);

dataService.subscribePolls(renderAdminPolls).catch((error) => {
  console.error(error);
  elements.adminPollList.innerHTML = '<div class="empty-state">Não foi possível carregar as votações.</div>';
});
