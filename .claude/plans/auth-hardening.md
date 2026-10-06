# Plano: Endurecimento da autenticação (auth hardening)

Plano de refatoração derivado da análise do fluxo de autenticação (front + back). Ver a documentação do fluxo em [.claude/docs/flows/authentication.md](../docs/flows/authentication.md).

Itens ordenados por severidade. `pinnn-me-be` = backend (este repo); `pinnn-me-web` = frontend (repo irmão).

> **TDD workflow** — Construa cada stage test-first. Para cada comportamento:
> escreva um teste que falha (red) → escreva o mínimo de código para passar
> (green) → refatore com os testes verdes. Não escreva código de produção sem um
> teste falhando que o justifique. Rode os testes do stage e mantenha-os verdes
> antes de avançar. Backend: Jest + `@nestjs/testing` (specs `*.spec.ts`
> co-localizados, dependências mockadas via `useValue`). Frontend (`pinnn-me-web`):
> Jest + Testing Library. Os comportamentos abaixo são observáveis pela interface
> pública (serviço/endpoint/UI), não por detalhes internos.

---

## Stage 1 — Críticos (segurança quebrada) 🔴

**Tests to write first**
- 🔴 Regressão (o bug): dado um hash válido e a **senha incorreta**, quando `validatePassword`, então lança `UnauthorizedException` (hoje passa — este teste falha antes do fix).
- Happy: dado o hash da senha correta, quando `validatePassword`, então resolve sem lançar.
- Erro (fluxo): dado e-mail existente e senha errada, quando `POST /auth/login`, então responde `401` e **não** emite tokens.
- Happy (fluxo): dado credenciais corretas, quando `POST /auth/login`, então retorna `access_token` + `refresh_token` e persiste o hash do refresh token.
- Cookie: dado login bem-sucedido, então o refresh token volta em cookie `httpOnly`+`Secure`+`SameSite` (header `Set-Cookie`) e **não** no corpo/`localStorage`.
- Cookie: dado `POST /auth/refresh` sem o cookie de refresh, então responde `401`.
- Logout: dado logout, então o cookie de refresh é limpo (`Set-Cookie` expirado).
- Frontend: dado login, então o access token fica só em memória (estado) e **nada** de token é escrito em `localStorage`.

- [x] **Corrigir validação de senha (no-op atual).** ✅ `src/credentials/credentials.service.ts` agora faz `const isValid = await bcrypt.compare(...)` antes de checar. Regressão coberta por `src/credentials/credentials.service.spec.ts` (senha incorreta → `UnauthorizedException`). Também repared o `auth.service.spec.ts` (DI desatualizada: faltavam `MuralsService` + repo de `RefreshToken`).
- [ ] **Tirar os tokens do `localStorage` (frontend).** Hoje `access_token` e `refresh_token` ficam em `localStorage` (`pinnn-me-web`: `AuthProvider.tsx`, `api-client/helpers/request.ts`), legíveis por qualquer XSS. Mover o **refresh token** para cookie `httpOnly` + `Secure` + `SameSite=Strict/Lax`, emitido pelo backend; manter o access token apenas em memória (Redux/contexto). Exige endpoints lendo/escrevendo cookie e CORS com `credentials`.

## Stage 2 — Alta prioridade 🟠

**Tests to write first**
- Expiry: dado um access token expirado (TTL curto), quando acessa rota protegida, então responde `401`; dado token dentro do TTL, então `200`.
- Expiry (config): dado o `JwtModule`, então assina com o `expiresIn` curto vindo da config (não `24h` hardcoded).
- Rotação (happy): dado um refresh token válido, quando `POST /auth/refresh`, então o token usado é revogado e um novo par é emitido; o token antigo deixa de funcionar.
- 🔒 Reuso (token family): dado um refresh token **já revogado** apresentado de novo, então **todos** os refresh tokens do usuário são revogados e responde `401`.
- 🔒 Reuso (efeito): dado que a detecção de reuso disparou, quando um refresh token mais novo do mesmo usuário é usado, então também é rejeitado (`401`) — sessão encerrada por completo.
- Edge: dado refresh token **expirado**, quando `POST /auth/refresh`, então `401` e nenhum par novo emitido.
- Secret (erro): dado `JWT_SECRET` ausente, quando a config/app inicializa, então falha rápido (lança), não assina com `undefined`.
- Secret (happy): dado `JWT_SECRET` presente, então inicializa e assina normalmente.

- [ ] **Encurtar o access token e alinhar com o design.** `src/auth/auth.module.ts` assina o JWT com `expiresIn: '24h'`, contradizendo o modelo de refresh token (access curto ~15 min). Definir `expiresIn` curto (ex.: `15m`) via config e deixar a sessão longa por conta do refresh token.
- [ ] **Detecção de reuso de refresh token (token family).** Hoje a rotação só revoga o token usado. Ao detectar uso de um refresh token **já revogado** (sinal de roubo), revogar **todos** os refresh tokens do usuário (encerrar todas as sessões). Requer agrupar tokens por família/sessão ou varrer por `userId`.
- [ ] **Exigir `JWT_SECRET` no boot.** `config/configuration.ts` não inclui `JWT_SECRET` em `requiredVars`, e `auth.module.ts` usa `configService.get` (não lança) — com segredo ausente o JWT é assinado com `undefined`. Adicionar `JWT_SECRET` aos `requiredVars` e usar `getOrThrow` de forma consistente.

## Stage 3 — Média prioridade 🟡

**Tests to write first**
- Throttling: dado mais de N requisições/min a `/auth/refresh` (e `/auth/logout`), então responde `429`; dentro do limite, então passa normalmente.
- Limpeza (happy): dado refresh tokens expirados e/ou revogados, quando a purga roda, então eles são removidos e os válidos permanecem.
- Limpeza (edge): dado nenhum token elegível, quando a purga roda, então não remove nada e não falha.
- Refresh concorrente (frontend): dado duas requisições recebendo `401` ao mesmo tempo, então apenas **uma** chamada a `/auth/refresh` é feita e ambas dão retry com o novo token.
- Fonte de verdade (frontend): dado um refresh bem-sucedido, então o token atualizado é lido de uma única origem (sem divergência entre estado e o usado nas requisições).

- [ ] **Rate limiting em `/auth/refresh` e `/auth/logout`.** Só `register`/`login` usam `@UseGuards(ThrottlerGuard)`; não há `APP_GUARD` global. Aplicar throttling (ou um `ThrottlerGuard` global) às demais rotas sensíveis.
- [ ] **Limpeza de refresh tokens expirados/revogados.** A tabela `refresh_tokens` cresce indefinidamente. Adicionar purga periódica (cron `@nestjs/schedule`) e/ou deletar o token na rotação em vez de só marcar `isRevoked`.
- [ ] **Unificar a fonte de verdade do token no frontend.** O token vive em `localStorage` **e** no Redux (`authSlice`), mas as requisições leem do `localStorage` — duplicação e risco de dessincronização. Consolidar (dependente do Stage 1, item de cookies).
- [ ] **Consolidar refresh entre abas/requisições.** Há dois caminhos de refresh independentes (`AuthProvider.initializeAuth` e `request.ts`); o guard `isRefreshing` é por módulo (não cross-tab). Centralizar o refresh num único mecanismo e sincronizar entre abas (ex.: `BroadcastChannel`/storage event) para evitar rotações concorrentes.

## Stage 4 — Baixa prioridade / melhorias 🟢

**Tests to write first**
- Boot (frontend): dado um refresh token válido no boot, então o usuário é carregado com uma **única** chamada de refresh (o `/auth/refresh` retorna o `user`), sem `validate → refresh → validate`.
- Rota protegida (servidor): dado um acesso não autenticado a uma rota protegida, então o servidor redireciona para `/login` **antes** de renderizar o conteúdo protegido.
- Cache da `JwtStrategy` (se adotado): dado uma mudança de role do usuário, então ela é refletida dentro do TTL do cache; dado usuário deletado, então a requisição é rejeitada.

- [ ] **Reduzir round-trips no boot do frontend.** `initializeAuth` faz `validate → refresh → validate`. Fazer o `/auth/refresh` retornar o `user` (ou validar o novo token uma vez só) para cortar uma chamada.
- [ ] **Proteção de rotas no servidor (Next.js).** `AuthGuard` é client-side; as páginas protegidas chegam a renderizar antes do redirect. Avaliar middleware/SSR de proteção (viável após mover o token para cookie, Stage 1).
- [ ] **Avaliar cache do usuário na `JwtStrategy`.** `validate` consulta o banco a cada requisição (`userService.find`). Manter pela frescor (revogação/role), mas avaliar cache curto se virar gargalo.

---

**Ordem sugerida:** Stage 1 → 2 → 3 → 4. Stage 1 é pré-requisito de vários itens dos Stages 3–4 (a migração para cookie destrava a unificação de fonte de verdade e a proteção via middleware).
