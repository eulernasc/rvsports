import { dataService } from "./data-service.js";

const elements = {
  modeBadge: document.querySelector("#modeBadge"),
  gamesGrid: document.querySelector("#gamesGrid"),
  pollGrid: document.querySelector("#pollGrid"),
  voteModal: document.querySelector("#voteModal"),
  voteModalTitle: document.querySelector("#voteModalTitle"),
  voteForm: document.querySelector("#voteForm"),
  votePollId: document.querySelector("#votePollId"),
  voteChoices: document.querySelector("#voteChoices"),
  voteMessage: document.querySelector("#voteMessage"),
  toast: document.querySelector("#toast")
};

let currentPolls = [];
let voteSubmitting = false;
const votedThisPage = new Set();

function initials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "RV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function setVoteMessage(message, type = "") {
  elements.voteMessage.textContent = message;
  elements.voteMessage.className = `form-message ${type}`.trim();
}

function isSafeImageSource(value = "") {
  return /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) || /^https:\/\//i.test(value);
}

function shieldMarkup(imageSource, teamName, side = "home") {
  const safeName = escapeHtml(teamName || "time");
  const sideClass = side === "away" ? " is-away" : "";
  if (isSafeImageSource(imageSource)) {
    return `<div class="final-team-shield has-image${sideClass}"><img src="${escapeHtml(imageSource)}" alt="Escudo do ${safeName}"></div>`;
  }
  return `<div class="final-team-shield${sideClass}">${escapeHtml(initials(teamName))}</div>`;
}

function formatGameDate(value = "") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "Data não informada";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function renderGames(games) {
  if (!games.length) {
    elements.gamesGrid.innerHTML = '<div class="empty-state">Nenhum placar final cadastrado ainda.</div>';
    return;
  }

  elements.gamesGrid.innerHTML = games.map((game) => {
    const dateText = formatGameDate(game.date);
    const timeText = game.time ? ` • ${escapeHtml(game.time)}` : "";
    const venueText = game.venue ? `<span>${escapeHtml(game.venue)}</span>` : "";
    const homeName = game.home || "Time da casa";
    const awayName = game.away || "Time visitante";

    return `
      <article class="final-score-card">
        <div class="final-score-topline">
          <div>
            <span class="final-pill">ENCERRADO</span>
            <h3>${escapeHtml(game.title || "Copa do Bairro")}</h3>
          </div>
          <div class="final-score-meta">
            <span>${escapeHtml(dateText)}${timeText}</span>
            ${venueText}
          </div>
        </div>

        <div class="final-score-body">
          <div class="final-team">
            ${shieldMarkup(game.homeImage, homeName, "home")}
            <strong>${escapeHtml(homeName)}</strong>
          </div>

          <div class="final-score-numbers" aria-label="${escapeHtml(homeName)} ${Number(game.homeScore || 0)} a ${Number(game.awayScore || 0)} ${escapeHtml(awayName)}">
            <span>${Number(game.homeScore || 0)}</span>
            <small>×</small>
            <span>${Number(game.awayScore || 0)}</span>
            <em>PLACAR FINAL</em>
          </div>

          <div class="final-team final-team-away">
            ${shieldMarkup(game.awayImage, awayName, "away")}
            <strong>${escapeHtml(awayName)}</strong>
          </div>
        </div>
      </article>`;
  }).join("");
}

function renderPolls(polls) {
  currentPolls = polls;
  const activePolls = polls.filter((poll) => poll.active);

  if (!activePolls.length) {
    elements.pollGrid.innerHTML = '<div class="empty-state">Nenhuma votação aberta no momento. Volte mais tarde para participar.</div>';
    return;
  }

  elements.pollGrid.innerHTML = activePolls.map((poll, index) => {
    const options = Object.values(poll.options || {});
    const total = options.reduce((sum, option) => sum + Number(option.votes || 0), 0);
    const alreadyVoted = votedThisPage.has(poll.id);

    return `
      <button class="poll-topic-card${alreadyVoted ? " is-voted" : ""}" type="button" data-poll-id="${escapeHtml(poll.id)}" ${alreadyVoted ? "aria-disabled=\"true\"" : ""}>
        <span class="poll-topic-number">VOTAÇÃO ${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(poll.question)}</strong>
        <span class="poll-topic-footer">
          <span>${options.length} opç${options.length === 1 ? "ão" : "ões"} • ${total} voto${total === 1 ? "" : "s"}</span>
          <b>${alreadyVoted ? "Voto enviado" : "Abrir votação →"}</b>
        </span>
      </button>`;
  }).join("");
}

function openVoteModal(poll) {
  if (!poll) return;
  if (votedThisPage.has(poll.id)) {
    showToast("Você já votou nesta votação. Recarregue a página para votar nela novamente.");
    return;
  }

  const options = Object.entries(poll.options || {});
  elements.votePollId.value = poll.id;
  elements.voteModalTitle.textContent = poll.question || "Votação";
  elements.voteChoices.innerHTML = options.map(([optionId, option], index) => `
    <label class="vote-choice">
      <input type="radio" name="voteOption" value="${escapeHtml(optionId)}" ${index === 0 ? "" : ""}>
      <span class="vote-check" aria-hidden="true"></span>
      <strong>${escapeHtml(option.label)}</strong>
    </label>`).join("");
  setVoteMessage("");
  elements.voteModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  window.setTimeout(() => elements.voteChoices.querySelector("input")?.focus(), 40);
}

function closeVoteModal() {
  if (voteSubmitting) return;
  elements.voteModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  elements.voteForm.reset();
  elements.votePollId.value = "";
  setVoteMessage("");
}

elements.pollGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".poll-topic-card");
  if (!card) return;
  const poll = currentPolls.find((item) => item.id === card.dataset.pollId);
  openVoteModal(poll);
});

elements.voteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (voteSubmitting) return;

  const pollId = elements.votePollId.value;
  const selected = elements.voteForm.querySelector('input[name="voteOption"]:checked');
  if (!selected) {
    setVoteMessage("Marque uma opção antes de confirmar.", "error");
    return;
  }

  if (votedThisPage.has(pollId)) {
    setVoteMessage("Você já votou nesta votação. Recarregue a página para votar novamente.", "error");
    return;
  }

  voteSubmitting = true;
  const submitButton = elements.voteForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  setVoteMessage("Registrando seu voto...");

  try {
    await dataService.vote(pollId, selected.value);
    votedThisPage.add(pollId);
    renderPolls(currentPolls);
    voteSubmitting = false;
    closeVoteModal();
    showToast("Voto registrado! Para votar nesta opção novamente, recarregue a página.");
  } catch (error) {
    console.error(error);
    setVoteMessage("Não foi possível registrar o voto agora.", "error");
    voteSubmitting = false;
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeVoteModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.voteModal.classList.contains("hidden")) {
    closeVoteModal();
  }
});

elements.modeBadge.textContent = dataService.isDemo ? "Modo demonstração" : "Resultados atualizados";

dataService.subscribeGames(renderGames).catch((error) => {
  console.error(error);
  elements.gamesGrid.innerHTML = '<div class="empty-state">Não foi possível carregar os placares.</div>';
  showToast("Erro ao carregar os resultados.");
});

dataService.subscribePolls(renderPolls).catch((error) => {
  console.error(error);
  elements.pollGrid.innerHTML = '<div class="empty-state">Não foi possível carregar as votações.</div>';
});
