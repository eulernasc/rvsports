import { dataService } from "./data-service.js?v=20260720-3";

const elements = {
  modeBadge: document.querySelector("#modeBadge"),
  gamesGrid: document.querySelector("#gamesGrid"),
  pollResultsGrid: document.querySelector("#pollResultsGrid"),
  toast: document.querySelector("#toast")
};

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

function initials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "RV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
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

function percentage(votes, total) {
  if (!total) return 0;
  return Math.round((Number(votes || 0) / total) * 1000) / 10;
}

function formatPercentage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}

function getPollResult(poll) {
  const options = Object.entries(poll.options || {}).map(([id, option]) => ({
    id,
    label: option.label || "Opção",
    votes: Number(option.votes || 0)
  }));

  const total = options.reduce((sum, option) => sum + option.votes, 0);
  const maxVotes = options.length ? Math.max(...options.map((option) => option.votes)) : 0;
  const winners = total > 0 ? options.filter((option) => option.votes === maxVotes) : [];
  return { options, total, maxVotes, winners };
}

function renderClosedPoll(poll, index) {
  const result = getPollResult(poll);
  let winnerLabel = "Sem votos registrados";
  let winnerCaption = "A votação foi encerrada sem votos.";

  if (result.winners.length === 1) {
    winnerLabel = result.winners[0].label;
    winnerCaption = "Opção mais votada";
  } else if (result.winners.length > 1) {
    winnerLabel = result.winners.map((winner) => winner.label).join(" • ");
    winnerCaption = "Empate entre as opções mais votadas";
  }

  const rows = result.options
    .sort((a, b) => b.votes - a.votes)
    .map((option) => {
      const value = percentage(option.votes, result.total);
      const isWinner = result.total > 0 && option.votes === result.maxVotes;

      return `
        <div class="poll-result-option${isWinner ? " is-winner" : ""}" style="--result-progress:${value}%">
          <span class="poll-result-progress" aria-hidden="true"></span>
          <div class="poll-result-option-content">
            <strong>${escapeHtml(option.label)}${isWinner ? '<em>MAIS VOTADO</em>' : ""}</strong>
            <span>${formatPercentage(value)}% • ${option.votes} voto${option.votes === 1 ? "" : "s"}</span>
          </div>
        </div>`;
    }).join("");

  return `
    <article class="poll-result-card">
      <div class="poll-result-heading">
        <span class="poll-topic-number">RESULTADO ${String(index + 1).padStart(2, "0")}</span>
        <span class="poll-closed-badge">ENCERRADA</span>
      </div>
      <h3>${escapeHtml(poll.question)}</h3>
      <div class="poll-winner-box">
        <span>${escapeHtml(winnerCaption)}</span>
        <strong>${escapeHtml(winnerLabel)}</strong>
      </div>
      <div class="poll-result-options">${rows}</div>
      <p class="poll-result-total">Total: ${result.total} voto${result.total === 1 ? "" : "s"}</p>
    </article>`;
}

function renderPollResults(polls) {
  const closedPolls = polls.filter((poll) => !poll.active && poll.showResults);

  if (!closedPolls.length) {
    elements.pollResultsGrid.innerHTML = '<div class="empty-state">Nenhum resultado de votação foi publicado ainda.</div>';
    return;
  }

  elements.pollResultsGrid.innerHTML = closedPolls.map(renderClosedPoll).join("");
}

elements.modeBadge.textContent = dataService.isDemo ? "Modo demonstração" : "Resultados atualizados";

dataService.subscribeGames(renderGames).catch((error) => {
  console.error(error);
  elements.gamesGrid.innerHTML = '<div class="empty-state">Não foi possível carregar os placares.</div>';
  showToast("Erro ao carregar os placares.");
});

dataService.subscribePolls(renderPollResults).catch((error) => {
  console.error(error);
  elements.pollResultsGrid.innerHTML = '<div class="empty-state">Não foi possível carregar os resultados das votações.</div>';
  showToast("Erro ao carregar os resultados das votações.");
});
