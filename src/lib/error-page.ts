export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      /* Paleta Apple (mismos valores que los tokens). Standalone: no
         puede usar var(--token), por eso hex + media query dark. */
      body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; background: #F5F5F7; color: #1D1D1F; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; -webkit-font-smoothing: antialiased; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 0.5rem; }
      p { color: #6E6E73; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.5rem; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: opacity .2s ease; }
      a:hover, button:hover { opacity: .9; }
      .primary { background: #1D1D1F; color: #FFFFFF; }
      .secondary { background: #FFFFFF; color: #1D1D1F; border-color: #D2D2D7; }
      @media (prefers-color-scheme: dark) {
        body { background: #000000; color: #F5F5F7; }
        p { color: #86868B; }
        .primary { background: #F5F5F7; color: #000000; }
        .secondary { background: #161617; color: #F5F5F7; border-color: #2A2A2C; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
