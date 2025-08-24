/**
 * @typedef {() => void} Fn
 * @typedef {WeakMap<object, Map<string, Set<Fn>>>} TargetWeakMap
 **/

(function (global) {
  /**
   * @type {TargetWeakMap}
   **/
  const targetMap = new WeakMap();
  /**
   * @type {Fn | null}
   **/
  let activeEffect = null;

  /**
   * Batching system for effects
   * @type {Set<Fn>}
   */
  const jobQueue = new Set();
  let isFlushing = false;

  /**
   * @param {Fn} job
   **/
  function queueJob(job) {
    jobQueue.add(job);
    if (!isFlushing) {
      isFlushing = true;
      queueMicrotask(flushJobs);
    }
  }

  function flushJobs() {
    try {
      for (const job of jobQueue) {
        job();
      }
    } finally {
      jobQueue.clear();
      isFlushing = false;
    }
  }

  /**
   * island registry
   * @type {Map<string, Record<string, unknown | Fn>}
   **/
  const islandRegistry = new Map();

  /**
   * @param {string} name
   * @param {Record<string, unknown | Fn>}
   **/
  function define(name, factory) {
    islandRegistry.set(name, factory);
  }

  /** @param {Fn} fn **/
  function effect(fn) {
    activeEffect = fn;
    fn();
    activeEffect = null;
  }

  /**
   * @param {Fn} fn
   * @param {string} key
   **/
  function track(target, key) {
    if (!activeEffect) return;

    let depsMap = targetMap.get(target);
    if (!depsMap) {
      depsMap = new Map();
      targetMap.set(target, depsMap);
    }

    let dep = depsMap.get(key);
    if (!dep) {
      dep = new Set();
      depsMap.set(key, dep);
    }

    dep.add(activeEffect);
  }

  /**
   * @param {Fn} fn
   * @param {string} key
   **/
  function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const dep = depsMap.get(key);
    if (dep) dep.forEach((fn) => queueJob(fn));
  }

  /**
   * @typedef {T extends Record<string, unknown> = Object} T
   * @param {T} obj
   * @returns {object}
   **/
  function reactive(obj) {
    return new Proxy(obj, {
      get(t, k, r) {
        const ok = Reflect.get(t, k, r);
        track(t, k);
        return ok;
      },
      set(t, k, v, r) {
        const ok = Reflect.set(t, k, v, r);
        trigger(t, k);
        return ok;
      },
    });
  }

  /**
   * @param {T} value
   * @typedef {{(): T, update: (fn: (v: T) => T | T) => void}} Signal
   * @returns {Signal}
   **/
  function createSignal(value) {
    if (value !== null && typeof value === "object") {
      console.warn("signal only primitive value");
      return;
    }

    const subs = new Set();
    let v = value;

    function signal() {
      if (activeEffect) subs.add(activeEffect);
      return v;
    }

    signal.update = function (next) {
      v = typeof next === "function" ? next(v) : next;
      subs.forEach((fn) => queueJob(fn));
    };

    return signal;
  }

  function compileExpression(expression) {
    const fnBody = `return state.${expression}`;

    return new Function("state", fnBody);
  }

  /**
   * @param {string} expression
   * @param {T} ctx
   * @param {HTMLElement} el
   **/
  function evaluate(expression, ctx) {
    try {
      const fn = Function("state", `with(state){return (${expression})}`);
      return fn(ctx);
    } catch (e) {
      console.error("[Zeno] eval error in", expression, e);
      return undefined;
    }
  }

  const qsa = (sel, root) =>
    Array.from((root || document).querySelectorAll(sel));

  /**
   * @returns {string}
   **/
  function getAttr(el, name) {
    return el.getAttribute(name);
  }

  /**
   * @param {HTMLElement} [root=document]
   **/
  function init(root = document) {
    const comps = qsa("[x-data]", root);
    comps.forEach(mount);
  }

  function bindTree(el, state) {
    walk(el, (node) => {
      bindNode(node, state);
    });
  }

  function mount(el) {
    const def = getAttr(el, "x-data") || "{}";
    const raw = evaluate(def, {});
    const state = reactive(isObj(raw) ? raw : {});

    bindTree(el, state);
  }

  function walk(node, visit) {
    visit(node);
    let child = node.firstElementChild;
    while (child) {
      const next = child.nextElementSibling;
      walk(child, visit);
      child = next;
    }
  }

  const isObj = (v) => typeof v === "object";

  function bindNode(el, state) {
    // x-text
    const xText = getAttr(el, "x-text");
    if (xText !== null) {
      const fn = compileExpression(xText);
      effect(() => {
        el.textContent = toDisplay(fn(state));
      });
    }

    // x-on:event and shorthand @event
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      const isOn = name.startsWith("x-on:");
      if (isOn) {
        const [_, ev] = name.split(":");
        const expr = attr.value;
        el.addEventListener(ev, () => {
          evaluate(expr, state);
        });
      }
    }

    // x-show
    const xShow = getAttr(el, "x-show");
    if (xShow) {
      const show = compileExpression(xShow);
      effect(() => {
        el.toggleAttribute("hidden", !show(state));
      });
    }

    /**
     * @name x-ctrl
     * @def x-ctrl="on:input|chnage"
     * @emit {value: any} ctrl
     */
    const xCtrl = getAttr(el, "x-ctrl");
    if (xCtrl) {
      const isOn = xCtrl.startsWith("on");

      if (!isOn) {
        console.warn(
          "declare x-ctrl without expression!! -> x-ctrl='on:input|change:callback(ctrl.value)'",
        );
        return;
      }

      const [_, ev, expr] = xCtrl.split(":");
      if (["input", "change"].includes(ev)) {
        el.addEventListener(ev, (e) => {
          evaluate(
            expr,
            Object.assign(state, { ctrl: { value: e.target.value } }),
          );
        });
      }
    }
  }

  function toDisplay(v) {
    return v === null ? "" : v;
  }

  /**
   * @param {HTMLElement} el
   **/
  function mountIsland(el) {
    const name = getAttr(el, "x-island");
    const dataProps = getAttr(el, "x-props") || "{}";
    const props = evaluate(dataProps, {});
    const factory = islandRegistry.get(name);
    if (!factory) {
      console.warn("you are creating island without define a factory!!");
      return;
    }
    const isSignalDeclarations = Object.values(props).every(
      (v) => v instanceof Function,
    );

    if (isSignalDeclarations) {
      const state = factory(props);
      bindTree(el, state);
      return;
    }

    const state = reactive(factory(props));
    bindTree(el, state);
  }

  // auto-init on DOMContentLoaded (SSR-friendly hydration)
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => init());
    } else {
      init();
    }
  }

  /**
   * @param {HTMLElement} [root=document]
   **/
  function initIsland(root = document) {
    const islands = qsa("[x-island]", root);
    islands.forEach(mountIsland);
  }

  global.Zeno = {
    reactive,
    effect,
    init,
    define,
    initIsland,
    createSignal,
  };
})(globalThis || window);
