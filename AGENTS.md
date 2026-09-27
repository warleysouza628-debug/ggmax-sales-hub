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

## GGMax AdMaker decisions
- AI calls live in src/lib/ai.server.ts (gateway) and src/lib/ai.functions.ts (auth + credit spend/refund); keys never reach the client.
- Credits are spent via the `spend_credits` DB function so balance checks are atomic; admin-editable costs/prompts live in `admin_settings`.
- Covers bucket is private (workspace blocks public buckets); store 1-year signed URLs in `covers.image_url` / `ads.cover_url`.
- Signed-in pages live under the pathless `_authenticated` layout with a client-side session gate (ssr: false).
- First user to sign up gets the admin role (handle_new_user trigger).
