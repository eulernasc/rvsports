import { dataService } from "./data-service.js?v=20260720-3";

const elements = {
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

function renderPolls(polls) {
  currentPolls = polls;
  const activePolls = polls.filter((poll) => poll.active);

  if (!activePolls.length) {
    elements.pollGrid.innerHTML = `
      <div class="empty-state">
        Nenhuma votação aberta no momento. Consulte a página de resultados para ver as votações encerradas.
      </div>`;
    return;
  }

  elements.pollGrid.innerHTML = activePolls.map((poll, index) => {
    const options = Object.values(poll.options || {});
    const total = options.reduce((sum, option) => sum + Number(option.votes || 0), 0);
    const alreadyVoted = votedThisPage.has(poll.id);

    return `
      <button class="poll-topic-card${alreadyVoted ? " is-voted" : ""}" type="button" data-poll-id="${escapeHtml(poll.id)}" ${alreadyVoted ? 'aria-disabled="true"' : ""}>
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
  if (!poll || !poll.active) {
    showToast("Esta votação já foi encerrada.");
    return;
  }

  if (votedThisPage.has(poll.id)) {
    showToast("Você já votou nesta votação. Recarregue a página para votar nela novamente.");
    return;
  }

  const options = Object.entries(poll.options || {});
  elements.votePollId.value = poll.id;
  elements.voteModalTitle.textContent = poll.question || "Votação";
  elements.voteChoices.innerHTML = options.map(([optionId, option]) => `
    <label class="vote-choice">
      <input type="radio" name="voteOption" value="${escapeHtml(optionId)}">
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
    showToast("Voto registrado! Para votar nesta votação novamente, recarregue a página.");
  } catch (error) {
    console.error(error);
    setVoteMessage(error.message || "Não foi possível registrar o voto agora.", "error");
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

dataService.subscribePolls(renderPolls).catch((error) => {
  console.error(error);
  elements.pollGrid.innerHTML = '<div class="empty-state">Não foi possível carregar as votações.</div>';
  showToast("Erro ao carregar as votações.");
});
