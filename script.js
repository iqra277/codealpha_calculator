(() => {
  "use strict";

  const resultEl = document.getElementById("result");
  const historyEl = document.getElementById("history");
  const keys = document.querySelector(".keys");

  const SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  const MAX_DIGITS = 15;

  const state = {
    current: "0",      // number being typed (string)
    previous: null,    // stored left operand (string)
    operator: null,    // + - * /
    overwrite: false,  // next digit replaces current (after = or error)
    error: false,
  };

  // ---------- Math ----------
  function calculate(a, b, op) {
    const x = parseFloat(a);
    const y = parseFloat(b);
    switch (op) {
      case "+": return x + y;
      case "-": return x - y;
      case "*": return x * y;
      case "/": return y === 0 ? NaN : x / y;
      default:  return y;
    }
  }

  // Avoid 0.1 + 0.2 = 0.30000000000000004
  function format(n) {
    if (!isFinite(n)) return "Error";
    const rounded = parseFloat(n.toPrecision(12));
    if (Math.abs(rounded) >= 1e15 || (Math.abs(rounded) < 1e-9 && rounded !== 0)) {
      return rounded.toExponential(6).replace(/\.?0+e/, "e");
    }
    return String(rounded);
  }

  // ---------- Display ----------
  function formatDisplay(str) {
    if (str === "Error" || str.includes("e")) return str;
    const negative = str.startsWith("-");
    const [intPart, decPart] = (negative ? str.slice(1) : str).split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (negative ? "-" : "") + withCommas + (decPart !== undefined ? "." + decPart : "");
  }

  function render() {
    resultEl.textContent = formatDisplay(state.current);

    // Real-time display: show the expression typed so far and a live result,
    // e.g. "12 + 34 = 46" while the user is still typing the second number.
    let line = "";
    if (state.previous !== null && state.operator) {
      line = `${formatDisplay(state.previous)} ${SYMBOLS[state.operator]}`;
      if (!state.overwrite) {
        line += ` ${formatDisplay(state.current)}`;
        const live = format(calculate(state.previous, state.current, state.operator));
        if (live !== "Error") line += ` = ${formatDisplay(live)}`;
      }
    }
    historyEl.textContent = line;

    // fit long numbers
    const len = resultEl.textContent.length;
    resultEl.style.fontSize = len > 14 ? "1.5rem" : len > 10 ? "2rem" : "";

    document.querySelectorAll(".key.operator").forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.dataset.value === state.operator && state.overwrite && state.previous !== null
      );
    });
  }

  // ---------- Actions ----------
  function resetIfError() {
    if (state.error) clearAll();
  }

  function inputNumber(d) {
    resetIfError();
    if (state.overwrite) {
      state.current = d;
      state.overwrite = false;
    } else if (state.current === "0") {
      state.current = d;
    } else if (state.current.replace(/[-.]/g, "").length < MAX_DIGITS) {
      state.current += d;
    }
    render();
  }

  function inputDecimal() {
    resetIfError();
    if (state.overwrite) {
      state.current = "0.";
      state.overwrite = false;
    } else if (!state.current.includes(".")) {
      state.current += ".";
    }
    render();
  }

  function chooseOperator(op) {
    resetIfError();
    // chain operations: 2 + 3 + -> 5 +
    if (state.operator && !state.overwrite) {
      compute();
      if (state.error) return;
    }
    state.previous = state.current;
    state.operator = op;
    state.overwrite = true;
    render();
  }

  function compute() {
    if (!state.operator || state.previous === null) return;
    const value = calculate(state.previous, state.current, state.operator);
    const out = format(value);
    if (out === "Error") {
      state.current = "Error";
      state.error = true;
      state.previous = null;
      state.operator = null;
      state.overwrite = true;
      return;
    }
    state.current = out;
    state.previous = null;
    state.operator = null;
    state.overwrite = true;
  }

  function equals() {
    if (!state.operator) return;
    const expr = `${formatDisplay(state.previous)} ${SYMBOLS[state.operator]} ${formatDisplay(state.current)} =`;
    compute();
    render();
    historyEl.textContent = state.error ? "" : expr;
  }

  function clearAll() {
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.overwrite = false;
    state.error = false;
    render();
  }

  function backspace() {
    if (state.error) return clearAll();
    if (state.overwrite) return;
    state.current = state.current.length > 1 && !(state.current.length === 2 && state.current.startsWith("-"))
      ? state.current.slice(0, -1)
      : "0";
    render();
  }

  function percent() {
    if (state.error) return;
    state.current = format(parseFloat(state.current) / 100);
    state.overwrite = true;
    render();
  }

  function negate() {
    if (state.error || state.current === "0") return;
    state.current = state.current.startsWith("-") ? state.current.slice(1) : "-" + state.current;
    render();
  }

  // ---------- Mouse / touch ----------
  keys.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const { action, value } = btn.dataset;
    switch (action) {
      case "number":   inputNumber(value); break;
      case "decimal":  inputDecimal(); break;
      case "operator": chooseOperator(value); break;
      case "equals":   equals(); break;
      case "clear":    clearAll(); break;
      case "delete":   backspace(); break;
      case "percent":  percent(); break;
      case "negate":   negate(); break;
    }
  });

  // ---------- Keyboard (bonus) ----------
  function flash(selector) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 120);
  }

  document.addEventListener("keydown", (e) => {
    const k = e.key;

    if (/^[0-9]$/.test(k)) {
      inputNumber(k);
      flash(`[data-action="number"][data-value="${k}"]`);
    } else if (k === ".") {
      inputDecimal();
      flash('[data-action="decimal"]');
    } else if (["+", "-", "*", "/"].includes(k)) {
      e.preventDefault(); // stop Firefox quick-find on "/"
      chooseOperator(k);
      flash(`[data-action="operator"][data-value="${k}"]`);
    } else if (k === "Enter" || k === "=") {
      e.preventDefault();
      equals();
      flash('[data-action="equals"]');
    } else if (k === "Backspace") {
      backspace();
      flash('[data-action="delete"]');
    } else if (k === "Escape" || k === "Delete") {
      clearAll();
      flash('[data-action="clear"]');
    } else if (k === "%") {
      percent();
      flash('[data-action="percent"]');
    }
  });

  render();
})();
