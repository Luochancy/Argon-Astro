function esc(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderGithubCard({ author, project, description = "", stars = "", forks = "", size = "full" }) {
  const repo = author + "/" + project;
  return "<div class=\"github-info-card github-info-card-" + esc(size) + " card shadow-sm\" data-author=\"" + esc(author) + "\" data-project=\"" + esc(project) + "\" data-getdata=\"backend\">"
    + "<div class=\"github-info-card-header\"><a href=\"https://github.com/\" target=\"_blank\" rel=\"nofollow noopener\"><span><i class=\"fa fa-github\"></i>" + (size === "mini" ? "" : " GitHub") + "</span></a></div>"
    + "<div class=\"github-info-card-body\"><div class=\"github-info-card-name-a\"><a href=\"https://github.com/" + esc(author) + "/" + esc(project) + "\" target=\"_blank\" rel=\"noopener\"><span class=\"github-info-card-name\">" + esc(repo) + "</span></a></div>"
    + "<div class=\"github-info-card-description\">" + description + "</div></div>"
    + "<div class=\"github-info-card-bottom\"><span class=\"github-info-card-meta github-info-card-meta-stars\"><i class=\"fa fa-star\"></i> <span class=\"github-info-card-stars\">" + esc(stars) + "</span></span>"
    + "<span class=\"github-info-card-meta github-info-card-meta-forks\"><i class=\"fa fa-code-fork\"></i> <span class=\"github-info-card-forks\">" + esc(forks) + "</span></span></div></div>";
}

export async function fillGithubCard(card, fetchImpl) {
  const response = await fetchImpl("https://api.github.com/repos/" + card.author + "/" + card.project, {
    headers: { accept: "application/vnd.github+json", "user-agent": "argon-astro" },
  });
  if (!response.ok) return renderGithubCard(card);
  const data = await response.json();
  return renderGithubCard({
    ...card,
    description: data.description || "",
    stars: data.stargazers_count ?? "",
    forks: data.forks_count ?? "",
  });
}
