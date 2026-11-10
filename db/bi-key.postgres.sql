-- Inserta la API key de demostración para Power BI.
-- La clave es demo-bi-key-123; solo se guarda su SHA-256.
INSERT INTO api_clients (name, key_hash, key_prefix, scope, active)
VALUES (
  'Power BI RutaIA',
  'd03fb04103f5a7d68a2d581be4cc9672423eb973fc180d1ce7a88548d1a72894',
  'demo-bi-key-12',
  'analytics:read',
  TRUE
)
ON CONFLICT (key_hash) DO NOTHING;

SELECT id, name, key_prefix, scope, active FROM api_clients;
