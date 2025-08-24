Deno.serve(async (req) => {
  const { pathname } = new URL(req.url);

  if (pathname.includes("/js/")) {
    const js = await Deno.readTextFile(`${Deno.cwd()}${pathname}`);

    return new Response(js, {
      headers: {
        "Content-Type": "application/javascript",
      },
    });
  }

  const html = await Deno.readTextFile(`${Deno.cwd()}/index.html`);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
});
