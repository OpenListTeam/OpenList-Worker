-- Migration: Add WebAuthn credentials table
-- Created: 2026-08-18
-- Description: Add support for FIDO2/WebAuthn passwordless authentication

CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    users_name TEXT NOT NULL,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_used_at INTEGER,
    device_name TEXT,
    FOREIGN KEY (users_name) REFERENCES users(users_name) ON DELETE CASCADE
);

CREATE INDEX idx_webauthn_users_name ON webauthn_credentials(users_name);
CREATE INDEX idx_webauthn_credential_id ON webauthn_credentials(credential_id);
