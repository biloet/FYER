(() => {
  const cfg = window.FYER_CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const state = { account: null, chainId: null, tab: "shield" };
  const target = () => cfg.network;
  const toHex = (n) => "0x" + n.toString(16);
  const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);

  // ---------- UI helpers ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  $("#navToggle").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => $("#navLinks").classList.remove("open")));
  $("#xLink").href = cfg.links.x;

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  // Hero balance scramble
  const glyphs = "0123456789";
  setInterval(() => {
    let s = "";
    for (let i = 0; i < 6; i++) s += glyphs[Math.floor(Math.random() * glyphs.length)];
    $("#heroBal").textContent = s.slice(0, 2) + "." + s.slice(2);
  }, 140);

  // ---------- Network details ----------
  function renderNet() {
    const n = cfg.network;
    $("#netDetails").innerHTML = `
      <dt>Network name</dt><dd>${n.chainName}</dd>
      <dt>Chain ID</dt><dd>${n.chainId}</dd>
      <dt>Currency</dt><dd>${n.nativeCurrency.symbol}</dd>
      <dt>RPC URL</dt><dd>${n.rpcUrls[0]}</dd>
      <dt>Explorer</dt><dd><a href="${n.blockExplorerUrls[0]}" target="_blank" rel="noopener">${n.blockExplorerUrls[0]}</a></dd>`;
  }
  renderNet();

  // ---------- Wallet ----------
  const eth = () => window.ethereum;

  async function switchChain() {
    const n = target();
    try {
      await eth().request({ method: "wallet_switchEthereumChain", params: [{ chainId: toHex(n.chainId) }] });
    } catch (err) {
      if (err && (err.code === 4902 || err.data?.originalError?.code === 4902)) {
        await eth().request({
          method: "wallet_addEthereumChain",
          params: [{ ...n, chainId: toHex(n.chainId) }],
        });
      } else {
        throw err;
      }
    }
  }

  async function connect() {
    if (!eth()) {
      toast("No EVM wallet found. Install MetaMask or Rabby.");
      return;
    }
    try {
      const [acc] = await eth().request({ method: "eth_requestAccounts" });
      state.account = acc;
      await switchChain();
      await refresh();
      toast("Connected to " + target().chainName);
    } catch (err) {
      toast(err?.message || "Connection rejected");
    }
  }

  async function refresh() {
    if (!eth()) return;
    state.chainId = parseInt(await eth().request({ method: "eth_chainId" }), 16);
    if (!state.account) {
      const accs = await eth().request({ method: "eth_accounts" });
      state.account = accs[0] || null;
    }
    updateStatus();
    if (state.account && state.chainId === target().chainId) {
      const wei = BigInt(await eth().request({ method: "eth_getBalance", params: [state.account, "latest"] }));
      $("#appBal").textContent = formatEth(wei) + " ETH";
    }
  }

  function formatEth(wei) {
    const whole = wei / 10n ** 18n;
    const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 5);
    return `${whole}.${frac}`;
  }

  function updateStatus() {
    const onChain = state.chainId === target().chainId;
    $("#appAddr").textContent = state.account ? short(state.account) : "Not connected";
    $("#appNet").textContent = state.chainId == null ? "—" : onChain ? target().chainName : `Wrong network (${state.chainId})`;
    if (!state.account || !onChain) $("#appBal").textContent = "—";
    $$("[data-connect]").forEach((b) => (b.textContent = state.account ? short(state.account) : "Connect wallet"));

    const submit = $("#appSubmit");
    if (!state.account) submit.textContent = "Connect wallet";
    else if (!onChain) submit.textContent = "Switch to Robinhood Chain";
    else submit.textContent = { shield: "Shield", send: "Send privately", withdraw: "Withdraw" }[state.tab];
  }

  $$("[data-connect]").forEach((b) => b.addEventListener("click", connect));
  $("#addNetBtn").addEventListener("click", async () => {
    if (!eth()) return toast("No EVM wallet found.");
    try {
      await switchChain();
      await refresh();
      toast(target().chainName + " added");
    } catch (err) {
      toast(err?.message || "Request rejected");
    }
  });

  if (eth()) {
    eth().on?.("accountsChanged", (a) => { state.account = a[0] || null; refresh(); });
    eth().on?.("chainChanged", () => { refresh(); });
    refresh().catch(() => {});
  }

  // ---------- App form ----------
  function feePct() {
    return cfg.fees[state.tab === "send" ? "transfer" : state.tab];
  }
  function updateFee() {
    const amt = parseFloat($("#inAmt").value) || 0;
    const pct = feePct();
    $("#feeVal").textContent = pct + "%";
    $("#recvVal").textContent = +(amt * (1 - pct / 100)).toFixed(6) + " ETH";
  }
  $("#inAmt").addEventListener("input", updateFee);

  $$("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-tab]").forEach((x) => x.classList.toggle("active", x === b));
      state.tab = b.dataset.tab;
      $("#fieldTo").hidden = state.tab === "shield";
      $("#appNote").textContent = "";
      updateFee();
      updateStatus();
    })
  );

  $("#appForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.account) return connect();
    if (state.chainId !== target().chainId) {
      try { await switchChain(); await refresh(); } catch (err) { toast(err?.message || "Switch rejected"); }
      return;
    }
    const amt = parseFloat($("#inAmt").value);
    if (!(amt > 0)) return toast("Enter an amount");
    if (state.tab !== "shield" && !/^0x[0-9a-fA-F]{40}$/.test($("#inTo").value.trim())) {
      return toast("Enter a valid recipient address");
    }
    if (!cfg.poolAddress) {
      $("#appNote").textContent = "The FYER shielded pool is not deployed yet. Set poolAddress in config.js after deployment.";
      return;
    }
    // Contract integration goes here once the pool ABI is final.
    $("#appNote").textContent = "Pool integration pending.";
  });

  updateFee();
  updateStatus();
})();
