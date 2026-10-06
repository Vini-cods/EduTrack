-- ============================================================
--  EduTrack — Script de criação do banco no SQL Server (SSMS)
--  Gerado automaticamente a partir dos models SQLAlchemy
--  Data: 2026-10-04
-- ============================================================

-- 1. Criar (ou selecionar) o banco de dados
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'EduTrackDB')
BEGIN
    CREATE DATABASE EduTrackDB;
END
GO

USE EduTrackDB;
GO

-- ============================================================
--  Tabela: users
--  Armazena os usuários (estudantes) do sistema.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id              INT           IDENTITY(1,1)  NOT NULL,
        name            NVARCHAR(255)                NOT NULL,
        email           NVARCHAR(255)                NOT NULL,
        hashed_password NVARCHAR(255)                NOT NULL,
        is_active       BIT           DEFAULT 1      NOT NULL,
        created_at      DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL,
        updated_at      DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL,

        CONSTRAINT PK_users PRIMARY KEY (id),
        CONSTRAINT UQ_users_email UNIQUE (email)
    );
END
GO

-- ============================================================
--  Tabela: subjects
--  Armazena as disciplinas acadêmicas de cada usuário.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='subjects' AND xtype='U')
BEGIN
    CREATE TABLE subjects (
        id             INT           IDENTITY(1,1)  NOT NULL,
        user_id        INT                          NOT NULL,
        name           NVARCHAR(255)                NOT NULL,
        color          NVARCHAR(20)                 NULL,
        professor      NVARCHAR(255)                NULL,
        workload_hours INT                          NULL,
        description    NVARCHAR(1000)               NULL,
        start_date     DATE                         NULL,
        end_date       DATE                         NULL,
        created_at     DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL,
        updated_at     DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL,

        CONSTRAINT PK_subjects   PRIMARY KEY (id),
        CONSTRAINT FK_subjects_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_subjects_user_id ON subjects(user_id);
END
GO

-- ============================================================
--  Tabela: tasks
--  Armazena as tarefas acadêmicas vinculadas a disciplinas.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tasks' AND xtype='U')
BEGIN
    CREATE TABLE tasks (
        id          INT           IDENTITY(1,1)  NOT NULL,
        user_id     INT                          NOT NULL,
        subject_id  INT                          NOT NULL,
        title       NVARCHAR(255)                NOT NULL,
        description NVARCHAR(1000)               NULL,
        due_date    DATE                         NULL,
        status      NVARCHAR(20)  DEFAULT 'pendente' NOT NULL,
        created_at  DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL,
        updated_at  DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET() NOT NULL,

        CONSTRAINT PK_tasks          PRIMARY KEY (id),
        CONSTRAINT FK_tasks_user
            FOREIGN KEY (user_id)    REFERENCES users(id),
        CONSTRAINT FK_tasks_subject
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
            ON DELETE CASCADE,
        CONSTRAINT CK_tasks_status CHECK (
            status IN ('pendente', 'em_andamento', 'concluida')
        )
    );

    CREATE INDEX IX_tasks_user_id    ON tasks(user_id);
    CREATE INDEX IX_tasks_subject_id ON tasks(subject_id);
END
GO

-- ============================================================
--  Trigger: atualiza updated_at automaticamente — users
-- ============================================================
IF OBJECT_ID('trg_users_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER trg_users_updated_at;
GO
CREATE TRIGGER trg_users_updated_at
ON users AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE users
    SET updated_at = SYSDATETIMEOFFSET()
    FROM users u
    INNER JOIN inserted i ON u.id = i.id;
END
GO

-- ============================================================
--  Trigger: atualiza updated_at automaticamente — subjects
-- ============================================================
IF OBJECT_ID('trg_subjects_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER trg_subjects_updated_at;
GO
CREATE TRIGGER trg_subjects_updated_at
ON subjects AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE subjects
    SET updated_at = SYSDATETIMEOFFSET()
    FROM subjects s
    INNER JOIN inserted i ON s.id = i.id;
END
GO

-- ============================================================
--  Trigger: atualiza updated_at automaticamente — tasks
-- ============================================================
IF OBJECT_ID('trg_tasks_updated_at', 'TR') IS NOT NULL
    DROP TRIGGER trg_tasks_updated_at;
GO
CREATE TRIGGER trg_tasks_updated_at
ON tasks AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE tasks
    SET updated_at = SYSDATETIMEOFFSET()
    FROM tasks t
    INNER JOIN inserted i ON t.id = i.id;
END
GO

-- ============================================================
--  Verificação final
-- ============================================================
SELECT
    t.name          AS [Tabela],
    c.name          AS [Coluna],
    tp.name         AS [Tipo],
    c.max_length    AS [Tamanho],
    c.is_nullable   AS [Aceita NULL],
    c.is_identity   AS [Auto-increment]
FROM sys.tables t
JOIN sys.columns c  ON t.object_id = c.object_id
JOIN sys.types  tp  ON c.user_type_id = tp.user_type_id
WHERE t.name IN ('users', 'subjects', 'tasks')
ORDER BY t.name, c.column_id;
GO
