

-- Roles
CREATE TABLE IF NOT EXISTS roles ( 
    id int PRIMARY KEY, 
    name varchar(255) NOT NULL UNIQUE 
);

INSERT INTO Roles (id, name) VALUES (1, 'Member') ON CONFLICT DO NOTHING ;
INSERT INTO Roles (id, name) VALUES (2, 'Admin') ON CONFLICT DO NOTHING ;


-- Users
-- Id = auto-generated RFC4122 uuid on create. Ex : 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed
CREATE TABLE IF NOT EXISTS users (
    id varchar(36) PRIMARY KEY ,
    username varchar(255) NOT NULL UNIQUE,
    password varchar(255) NOT NULL,
    role_id int 
);
