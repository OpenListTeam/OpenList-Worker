import { getDb, saveDb, User } from "../model/db"
import { parseSshKey, sshKeyFingerprint, newSshKeyId } from "../../pkg/sshkey"

export interface StoredSshKey {
  id: string
  name: string
  public_key: string
  fingerprint: string
  created_at: string
}

export async function listUserSshKeys(
  userId: number,
  env?: any,
): Promise<StoredSshKey[]> {
  const db = await getDb(env)
  const user = (db.users || []).find((u: User) => u.id === userId)
  if (!user) return []
  return (user.ssh_keys as StoredSshKey[]) || []
}

export async function addUserSshKey(
  userId: number,
  keyText: string,
  name?: string,
  env?: any,
): Promise<StoredSshKey> {
  const parsed = parseSshKey(keyText)
  if (!parsed) {
    throw new Error("Invalid OpenSSH public key format")
  }
  const fp = await sshKeyFingerprint(keyText)
  if (!fp) {
    throw new Error("Failed to compute SSH key fingerprint")
  }

  const db = await getDb(env)
  const user = (db.users || []).find((u: User) => u.id === userId)
  if (!user) {
    throw new Error("User not found")
  }
  if (!Array.isArray(user.ssh_keys)) {
    user.ssh_keys = []
  }

  // Prevent duplicate fingerprints
  if (user.ssh_keys.some((k: StoredSshKey) => k.fingerprint === fp)) {
    throw new Error("SSH key with this fingerprint already exists")
  }

  const item: StoredSshKey = {
    id: newSshKeyId(),
    name: (name || parsed.comment || parsed.type).slice(0, 64),
    public_key: keyText.trim(),
    fingerprint: fp,
    created_at: new Date().toISOString(),
  }
  user.ssh_keys.push(item)
  await saveDb(db, env)
  return item
}

export async function deleteUserSshKey(
  userId: number,
  keyId: string,
  env?: any,
): Promise<boolean> {
  const db = await getDb(env)
  const user = (db.users || []).find((u: User) => u.id === userId)
  if (!user || !Array.isArray(user.ssh_keys)) return false
  const prevLen = user.ssh_keys.length
  user.ssh_keys = user.ssh_keys.filter((k: StoredSshKey) => k.id !== keyId)
  if (user.ssh_keys.length !== prevLen) {
    await saveDb(db, env)
    return true
  }
  return false
}
