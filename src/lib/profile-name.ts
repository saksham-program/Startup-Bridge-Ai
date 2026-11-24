export function resolveProfileName(profileName: string | null | undefined, accountName: string | null | undefined) {
  const currentName = profileName?.trim();
  if (currentName) return currentName;

  const recoveredName = accountName?.trim();
  return recoveredName || null;
}