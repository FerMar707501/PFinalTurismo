-- ============================================================
-- RutaIA — Esquema de base de datos (MySQL 8)
-- Proyecto final de Programación Comercial
--
-- Ejecutar con:
--   mysql -u root -p < db/schema.sql
-- o dejar que Docker lo ejecute al crear el volumen.
--
-- ADVERTENCIA: este script elimina y recrea las tablas.
-- ============================================================

CREATE DATABASE IF NOT EXISTS rutaia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

USE rutaia;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

DROP VIEW IF EXISTS v_usage_by_service;
DROP VIEW IF EXISTS v_usage_daily;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS external_cache;
DROP TABLE IF EXISTS api_clients;
DROP TABLE IF EXISTS agent_runs;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS destinations;
DROP TABLE IF EXISTS ai_services;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- Usuarios y roles
-- ------------------------------------------------------------
CREATE TABLE users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(120)    NOT NULL,
  email             VARCHAR(190)    NOT NULL,
  password_hash     VARCHAR(255)    NOT NULL,
  role              ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  token_limit_month INT UNSIGNED    NOT NULL DEFAULT 50000,
  active            TINYINT(1)      NOT NULL DEFAULT 1,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_active (role, active)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Catálogo turístico
-- ------------------------------------------------------------
CREATE TABLE destinations (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150)    NOT NULL,
  region       VARCHAR(120)    NOT NULL,
  description  TEXT            NOT NULL,
  category     VARCHAR(80)     NOT NULL,
  tags         VARCHAR(255)    NULL,
  lat          DECIMAL(10, 7)  NULL,
  lng          DECIMAL(10, 7)  NULL,
  price_level  TINYINT UNSIGNED NOT NULL DEFAULT 2
               COMMENT '1 = económico, 4 = lujo',
  best_season  VARCHAR(100)    NULL,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_destinations_name_region (name, region),
  KEY idx_destinations_region (region),
  KEY idx_destinations_category (category),
  KEY idx_destinations_active (active)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

CREATE TABLE activities (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  destination_id BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(180)    NOT NULL,
  description    TEXT            NOT NULL,
  category       VARCHAR(80)     NOT NULL,
  duration_min   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  price          DECIMAL(12, 2) UNSIGNED NOT NULL DEFAULT 0,
  lat            DECIMAL(10, 7)  NULL,
  lng            DECIMAL(10, 7)  NULL,
  active         TINYINT(1)      NOT NULL DEFAULT 1,
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_activities_destination_name (destination_id, name),
  KEY idx_activities_destination (destination_id),
  KEY idx_activities_category (category),
  KEY idx_activities_active (active),
  CONSTRAINT fk_activities_destination
    FOREIGN KEY (destination_id) REFERENCES destinations (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Documentos para el RAG (fuente de recuperación)
-- ------------------------------------------------------------
CREATE TABLE documents (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_type VARCHAR(40)     NOT NULL
              COMMENT 'destination, activity, manual, external',
  source_id   BIGINT UNSIGNED NULL,
  chunk_index SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  title       VARCHAR(200)    NOT NULL,
  content     MEDIUMTEXT      NOT NULL,
  url         VARCHAR(500)    NULL,
  metadata    JSON            NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_documents_source (source_type, source_id, chunk_index),
  KEY idx_documents_source (source_type, source_id),
  FULLTEXT KEY ft_documents_title_content (title, content)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Servicios de IA configurables
-- ------------------------------------------------------------
CREATE TABLE ai_services (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(60)     NOT NULL,
  name          VARCHAR(120)    NOT NULL,
  description   TEXT            NOT NULL,
  model         VARCHAR(120)    NOT NULL DEFAULT 'openai/gpt-oss-120b',
  temperature   DECIMAL(3, 2)   NOT NULL DEFAULT 0.20,
  max_tokens    INT UNSIGNED    NOT NULL DEFAULT 1024,
  system_prompt TEXT            NOT NULL,
  enabled       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_services_code (code),
  KEY idx_ai_services_enabled (enabled)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Conversaciones e historial
-- ------------------------------------------------------------
CREATE TABLE conversations (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  service_code    VARCHAR(60)     NOT NULL,
  title           VARCHAR(200)    NULL,
  summary         TEXT            NULL,
  last_message_at TIMESTAMP       NULL DEFAULT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversations_user (user_id, last_message_at),
  KEY idx_conversations_service (service_code),
  CONSTRAINT fk_conversations_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_conversations_service
    FOREIGN KEY (service_code) REFERENCES ai_services (code)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

CREATE TABLE messages (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  role            ENUM('system', 'user', 'assistant', 'tool') NOT NULL,
  content         MEDIUMTEXT      NOT NULL,
  sources_json    JSON            NULL,
  tokens_in       INT UNSIGNED    NOT NULL DEFAULT 0,
  tokens_out      INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at      TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id, id),
  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Consumo de tokens (tabla de hechos para analítica)
-- ------------------------------------------------------------
CREATE TABLE usage_logs (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  service_code      VARCHAR(60)     NOT NULL,
  conversation_id   BIGINT UNSIGNED NULL,
  message_id        BIGINT UNSIGNED NULL,
  model             VARCHAR(120)    NOT NULL,
  prompt_tokens     INT UNSIGNED    NOT NULL DEFAULT 0,
  completion_tokens INT UNSIGNED    NOT NULL DEFAULT 0,
  total_tokens      INT UNSIGNED    NOT NULL DEFAULT 0,
  latency_ms        INT UNSIGNED    NULL,
  status            ENUM('success', 'error', 'blocked') NOT NULL DEFAULT 'success',
  error_code        VARCHAR(60)     NULL,
  created_at        TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_usage_user_date (user_id, created_at),
  KEY idx_usage_service_date (service_code, created_at),
  KEY idx_usage_date (created_at),
  CONSTRAINT fk_usage_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_usage_service
    FOREIGN KEY (service_code) REFERENCES ai_services (code)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_usage_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_usage_message
    FOREIGN KEY (message_id) REFERENCES messages (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Ejecuciones de agentes multi-paso
-- ------------------------------------------------------------
CREATE TABLE agent_runs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  service_code  VARCHAR(60)     NOT NULL,
  input_json    JSON            NOT NULL,
  output_json   JSON            NULL,
  steps_json    JSON            NULL,
  status        ENUM('running', 'success', 'error', 'partial')
                                NOT NULL DEFAULT 'success',
  total_tokens  INT UNSIGNED    NOT NULL DEFAULT 0,
  latency_ms    INT UNSIGNED    NULL,
  created_at    TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_agent_runs_user_date (user_id, created_at),
  KEY idx_agent_runs_service_date (service_code, created_at),
  CONSTRAINT fk_agent_runs_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_agent_runs_service
    FOREIGN KEY (service_code) REFERENCES ai_services (code)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Consumidores externos (Power BI, Postman)
-- ------------------------------------------------------------
CREATE TABLE api_clients (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120)    NOT NULL,
  key_hash     CHAR(64)        NOT NULL COMMENT 'SHA-256 en hexadecimal',
  key_prefix   VARCHAR(20)     NOT NULL,
  scope        VARCHAR(120)    NOT NULL DEFAULT 'analytics:read',
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP       NULL DEFAULT NULL,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_api_clients_key_hash (key_hash),
  KEY idx_api_clients_active (active)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Caché de respuestas externas (Open-Meteo, OSRM, Wikipedia)
-- ------------------------------------------------------------
CREATE TABLE external_cache (
  cache_key  VARCHAR(191) NOT NULL,
  payload    MEDIUMTEXT   NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cache_key),
  KEY idx_external_cache_expires (expires_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_spanish_ci;

-- ------------------------------------------------------------
-- Vistas de apoyo para el reporte web y Power BI
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW v_usage_daily AS
SELECT
  DATE(created_at)                    AS usage_date,
  service_code,
  user_id,
  COUNT(*)                            AS requests,
  COALESCE(SUM(prompt_tokens), 0)     AS prompt_tokens,
  COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
  COALESCE(SUM(total_tokens), 0)      AS total_tokens
FROM usage_logs
WHERE status = 'success'
GROUP BY DATE(created_at), service_code, user_id;

CREATE OR REPLACE VIEW v_usage_by_service AS
SELECT
  service_code,
  COUNT(*)                            AS requests,
  COALESCE(SUM(prompt_tokens), 0)     AS prompt_tokens,
  COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
  COALESCE(SUM(total_tokens), 0)      AS total_tokens
FROM usage_logs
WHERE status = 'success'
GROUP BY service_code;
