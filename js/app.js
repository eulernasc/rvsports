import { dataService } from "./data-service.js";

const elements = {
  modeBadge: document.querySelector("#modeBadge"),
  gameStatus: document.querySelector("#gameStatus"),
  gameTitle: document.querySelector("#gameTitle"),
  gameClock: document.querySelector("#gameClock"),
  gameVenue: document.querySelector("#gameVenue"),
  homeName: document.querySelector("#homeName"),
  awayName: document.querySelector("#awayName"),
  homeInitials: document.querySelector("#homeInitials"),
  awayInitials: document.querySelector("#awayInitials"),
  homeScore: document.querySelector("#homeScore"),
  awayScore: document.querySelector("#awayScore"),
  pollGrid: document.querySelector("#pollGrid"),
  toast: document.querySelector("#toast")
};

let votingLock = false;

function initials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
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
  showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function renderGame(game) {
  const status = game.status || "PRÉ-JOGO";
  elements.gameStatus.textContent = status;
  elements.gameStatus.classList.toggle("is-live", status === "AO VIVO");
  elements.gameTitle.textContent = game.title || "Copa do Bairro";
  elements.gameClock.textContent = game.clock || "Horário a definir";
  elements.gameVenue.textContent = game.venue || "Local a definir";
  elements.homeName.textContent = game.home || "Time da casa";
  elements.awayName.textContent = game.away || "Time visitante";
  elements.homeInitials.textContent = initials(game.home);
  elements.awayInitials.textContent = initials(game.away);
  elements.homeScore.textContent = Number(game.homeScore || 0);
  elements.awayScore.textContent = Number(game.awayScore || 0);
}

function renderPolls(polls) {
  const activePolls = polls.filter((poll) => poll.active);

  if (!activePolls.length) {
    elements.pollGrid.innerHTML = '<div class="empty-state">Nenhuma votação aberta no momento. Volte mais tarde para participar.</div>';
    return;
  }

  elements.pollGrid.innerHTML = activePolls.map((poll, index) => {
    const options = Object.entries(poll.options || {});
    const total = options.reduce((sum, [, option]) => sum + Number(option.votes || 0), 0);

    const optionButtons = options.map(([optionId, option]) => {
      const votes = Number(option.votes || 0);
      const percentage = total > 0 ? Math.round((votes / total) * 100) : 0;
      return `
        <button class="poll-option" type="button" data-poll-id="${escapeHtml(poll.id)}" data-option-id="${escapeHtml(optionId)}" style="--progress:${percentage}%">
          <span class="option-progress"></span>
          <span class="option-content">
            <strong>${escapeHtml(option.label)}</strong>
            <span>${percentage}% • ${votes}</span>
          </span>
        </button>`;
    }).join("");

    return `
      <article class="poll-card">
        <div class="poll-card-header">
          <div>
            <span class="eyebrow">VOTAÇÃO ${String(index + 1).padStart(2, "0")}</span>
            <h3>${escapeHtml(poll.question)}</h3>
          </div>
          <span class="vote-count">${total} voto${total === 1 ? "" : "s"}</span>
        </div>
        <div class="poll-options">${optionButtons}</div>
      </article>`;
  }).join("");
}

elements.pollGrid.addEventListener("click", async (event) => {
  const button = event.target.closest(".poll-option");
  if (!button || votingLock) return;

  votingLock = true;
  button.disabled = true;
  try {
    await dataService.vote(button.dataset.pollId, button.dataset.optionId);
    showToast("Voto registrado! Pode votar novamente quando quiser.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível registrar o voto agora.");
  } finally {
    button.disabled = false;
    setTimeout(() => { votingLock = false; }, 220);
  }
});

elements.modeBadge.textContent = dataService.isDemo ? "Modo demonstração" : "Atualização em tempo real";

dataService.subscribeGame(renderGame).catch((error) => {
  console.error(error);
  showToast("Erro ao carregar o placar.");
});

dataService.subscribePolls(renderPolls).catch((error) => {
  console.error(error);
  elements.pollGrid.innerHTML = '<div class="empty-state">Não foi possível carregar as votações.</div>';
});
