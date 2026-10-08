<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Keep shareable portfolio sections in individual TanStack routes with reusable section components, so navigation supports direct links and page-specific metadata.
- Keep project data and contact configuration in browser-safe modules; request submission is an in-memory demo with no sending or persistence.
- Define visual styles and semantic color roles in the global Tailwind v4 design system, so every page follows one consistent theme.
