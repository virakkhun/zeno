# Zeno 🌀

A tiny declarative reactivity & islands library for the web

Zeno is a minimal reactive micro-framework inspired by Alpine.js and Solid.js, built for SSR + islands architecture.

- Declarative attributes (x-data, x-text, x-show, x-on, etc.)
- Signals (Zeno.createSignal) for fine-grained reactivity
- Islands (x-island) for server-rendered hydration and reusable components
- Zero build step – works with plain `<script type="module">`

> ⚠️ Experimental, but ready to rock.
> Zeno is lightweight, hackable, and fun to use — but it’s still evolving. Expect changes, but also expect to be productive right now.

## Getting Started

You can use Zeno via CDN or as a local module.

1. via CDN

```html
<script type="module">
  import "https://unpkg.com/@virakkhun/zeno.js";

  const count = Zeno.signal(0);
  console.log(count()); // 0
  count.update((v) => v + 1);
  console.log(count()); // 1
</script>
```

2. via Local

```html
<script type="module">
  import "./js/zeno.js";

  const count = Zeno.signal(5);
  console.log(count()); // 5
</script>
```

That’s it — no build system, no config. Just drop in a script and start writing declarative components.

## Example

```html
<div x-data="{ count: 0 }">
  <h1 x-text="count"></h1>
  <button x-on:click="count+=1">+</button>
  <button x-on:click="count-=1">-</button>
</div>

<br />

<div x-data="{ open: false }">
  <button x-on:click="open = !open">toggle</button>
  <div x-show="open">
    <p>Hello bro 👋</p>
  </div>
</div>

<br />

<div x-island="person" x-props="{ name: Zeno.createSignal('dara') }">
  <div>
    <span>Name: </span>
    <span x-text="name()"></span>
  </div>
  <div>
    <label for="name"> Input name </label>
    <input x-ctrl="on:input:onInputChanged(ctrl.value)" id="name" />
  </div>
</div>

<script type="module">
  import "./js/zeno.js";

  Zeno.define("person", (props) => {
    return {
      name: props.name,
      onInputChanged(value) {
        this.name.update(value);
      },
    };
  });

  Zeno.initIsland();
</script>
```

## Features

- 🎯 Signals – fine-grained reactivity without a VDOM
- 🏝️ Islands-first – hydrate only what you need, not the whole page
- 🧩 Declarative syntax – x-data, x-text, x-on, x-show, etc.
- ⚡ SSR friendly – works with react-dom/server, deno, or static HTML
- 🚫 No build required – just import a single JS module

## Why Zeno?

There are already awesome libraries out there like Alpine.js, Preact, Vue, and Solid.js. So why another one?

- 🪶 Smaller & simpler – Zeno is tiny enough to read in one sitting
- 🎨 Fewer abstractions – it’s just plain JS + attributes
- 🌐 SSR islands built-in – hydration is first-class, no extra plugins
- 🤝 Friendly with others – Zeno doesn’t try to replace your stack, it plays nicely with it
- 🔬 Experimental but fun – a space to explore new patterns without bloat

## About

With the assist from Chat-GPT, Zeno now exists - lightweight, experimental, and ready to hack. 🤟
