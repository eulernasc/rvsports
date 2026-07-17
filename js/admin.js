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
      venue: $("#gameVenueInput").value
    });
    setMessage(elements.gameMessage, "Placar atualizado com sucesso.", "success");
    showToast("Placar salvo e atualizado no site.");
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
  if (!gameLoadedOnce || document.activeElement?.tagName !== "INPUT") {
    fillGameForm(game);
  }
}).catch(console.error);

dataService.subscribePolls(renderAdminPolls).catch((error) => {
  console.error(error);
  elements.adminPollList.innerHTML = '<div class="empty-state">Não foi possível carregar as votações.</div>';
});
