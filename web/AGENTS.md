<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Commit hygiene — no Claude attribution

**Never add a `Co-Authored-By: Claude …` trailer to commits** (or any variant referencing Claude / Anthropic / `noreply@anthropic.com`). The user does not want Claude appearing in the GitHub Contributors sidebar. Removing it after the fact required a full history rewrite + tag re-pointing + force-push + repository rename to bust GitHub's cache — do not cause that work again.

Commit messages end at the last line of the body. No co-author trailer, no `Signed-off-by: Claude`, no variant. Applies to `git commit`, amend, rebase, cherry-pick — every history-writing path.
