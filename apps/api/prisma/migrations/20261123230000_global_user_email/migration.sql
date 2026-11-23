DROP INDEX "usuarios_empresaId_email_key";

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
