"use strict";
/* Bond0 web is a static PREVIEW until a protected, authenticated API gateway exists.
 * Do not persist tunnel keys or administrator credentials in the browser. */
const defaults = ["Ethernet 3", "Wi-Fi 2"];
const selected = [...defaults];
const labels = {
  overview: "Painel geral",
  networks: "Interfaces de rede",
  server: "Servidor Oracle",
  share: "Partilhar Internet",
  tests: "Testes e métricas",
  settings: "Definições"
};
function safeName(value) {
  const name = String(value).trim().replace(/\s+/g, " ");
  if (!name || name.length > 90 || /[<>"'\\\x00-\x1f]/.test(name)) return null;
  if (/^(bond0|bonding|.*wi-fi direct.*|.*virtual.*)$/i.test(name)) return null;
  return name;
}
function setView(view) {
  if (!Object.prototype.hasOwnProperty.call(labels, view)) return;
  for (const section of document.querySelectorAll(".view")) section.classList.toggle("active", section.id === view);
  for (const item of document.querySelectorAll(".nav-item")) {
    const active = item.dataset.view === view;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  document.getElementById("breadcrumb").textContent = labels[view];
  location.hash = view;
}
function textElement(tag, text, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.textContent = text;
  return el;
}
function networkRow(name, removable) {
  const row = textElement("div", "", "network-row");
  row.appendChild(textElement("div", "⌁", "network-icon"));
  const d = textElement("div", "", "network-details");
  d.appendChild(textElement("strong", name));
  d.appendChild(textElement("small", "Interface proposta · verificação pendente"));
  row.appendChild(d);
  row.appendChild(textElement("span", "Em espera", "network-tag"));
  if (removable) {
    const button = textElement("button", "Remover", "icon-button");
    button.type = "button";
    button.setAttribute("aria-label", "Remover " + name);
    button.addEventListener("click", () => {
      const index = selected.findIndex(x => x.toLowerCase() === name.toLowerCase());
      if (index !== -1) selected.splice(index, 1);
      renderNetworks();
    });
    row.appendChild(button);
  }
  return row;
}
function renderNetworks() {
  const list = document.getElementById("networks-list");
  const overview = document.getElementById("overview-paths");
  list.replaceChildren();
  overview.replaceChildren();
  if (!selected.length) {
    list.appendChild(textElement("p", "Nenhuma rede escolhida. Adiciona pelo menos uma.", "helper"));
    overview.appendChild(textElement("p", "Sem interfaces propostas.", "helper"));
  }
  for (const name of selected) {
    list.appendChild(networkRow(name, true));
    overview.appendChild(networkRow(name, false));
  }
}
function addNetwork(event) {
  event.preventDefault();
  const input = document.getElementById("new-network");
  const name = safeName(input.value);
  if (!name) {
    alert("Introduz um nome válido de adaptador físico. Excluímos Bond0, Wi-Fi Direct e adaptadores virtuais.");
    return;
  }
  if (selected.some(x => x.toLowerCase() === name.toLowerCase())) {
    alert("Esta rede já se encontra na lista.");
    return;
  }
  selected.push(name);
  input.value = "";
  renderNetworks();
}
function checkApi() {
  const value = document.getElementById("api-url").value.trim();
  const msg = document.getElementById("api-result");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw Error("É obrigatório usar HTTPS.");
    if (!url.hostname || url.username || url.password || url.hash) throw Error("Endereço inválido ou com credenciais.");
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname))
      throw Error("A interface pública requer um domínio HTTPS protegido.");
    msg.textContent = "Endereço HTTPS válido. A ligação de gestão depende da implementação do servidor OIDC/PKCE e de um gateway seguro. Nenhum pedido foi enviado.";
  } catch (e) {
    msg.textContent = "Não configurado: " + e.message;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  for (const item of document.querySelectorAll("[data-view]")) {
    item.addEventListener("click", () => setView(item.dataset.view));
  }
  for (const item of document.querySelectorAll("[data-go]")) {
    item.addEventListener("click", () => setView(item.dataset.go));
  }
  document.getElementById("add-network").addEventListener("submit", addNetwork);
  document.getElementById("btn-api-check").addEventListener("click", checkApi);
  const initial = location.hash.replace(/^#/, "");
  setView(labels[initial] ? initial : "overview");
  renderNetworks();
});
