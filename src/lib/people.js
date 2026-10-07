// The API returns people as { firstName, lastName } (usually nested under
// `user`, sometimes under `projectUser.user` / `organizationUser.user`), not a
// single `name` field. The display name is firstName + lastName, or the email when no name is set.
export function personUser(m = {}) {
  return m.user || m.projectUser?.user || m.organizationUser?.user || m.author || m;
}

export function personName(m, fallback = "Unnamed") {
  const u = personUser(m) || {};
  // People who signed in by email code never filled in a name, so firstName and
  // lastName are empty for them — show their email instead of "Unnamed".
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || m?.email || fallback;
}

export function personImage(m) {
  const u = personUser(m) || {};
  return u.imageUrl || u.avatarUrl || u.avatar || m?.imageUrl || m?.avatar || null;
}
