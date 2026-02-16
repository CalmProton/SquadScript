This project uses Bun as the runtime, package manager, and test runner. Please use `bun` and `bunx` commands instead of `npm` and `npx`. (`bun tsc --noEmit 2>&1`)

For the dashboard app (`projects/app`), use `@nuxt/icon` via the `<Icon />` component.

- Example usage: `<Icon name="uil:github" />`
- Primary icon library: `solar` (prefer names like `solar:...` for app UI icons)
- Spinner/loader icons: use `svg-spinners:...`

Install icon datasets locally (recommended) with Bun, for example:

- `bun add -d @iconify-json/solar @iconify-json/svg-spinners`

Do not use `npm i -D` in this repository.