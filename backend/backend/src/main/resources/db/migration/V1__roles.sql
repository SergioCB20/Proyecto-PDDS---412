CREATE TABLE roles (
    id       UUID PRIMARY KEY,
    nombre   VARCHAR(50)  NOT NULL UNIQUE,
    permisos TEXT         NOT NULL
);