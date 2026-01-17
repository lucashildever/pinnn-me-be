# Mural Ativo - Especificação Técnica

**Status:** implemented

---

## 1. Visão Geral

**"Mural Ativo"** representa qual mural o usuário está editando no momento. Isso resolve o problema de contexto quando um usuário possui múltiplos murais.

---

## 2. Requisitos

### Funcionais

- **RF1:** Adicionar campo `activeMuralId` na entidade `UserEntity`
- **RF2:** Criar endpoint para listar todos os murais do usuário autenticado
- **RF3:** Criar endpoint para definir o mural ativo
- **RF4:** Retornar `activeMuralId` na resposta de autenticação (login)
- **RF5:** Automaticamente definir o primeiro mural criado como ativo (se não houver mural ativo)

### Não Funcionais

- Manter retrocompatibilidade com usuários existentes (campo nullable)
- Validar que o mural pertence ao usuário antes de definir como ativo

---

## 3. Decisões Técnicas

### Por que persistir no banco?

| Alternativa            | Prós                             | Contras                                           |
| ---------------------- | -------------------------------- | ------------------------------------------------- |
| **Persistir no banco** | ✅ Mantém contexto entre sessões | ❌ Mais complexo                                  |
| **Apenas frontend**    | ✅ Simples                       | ❌ Perde contexto ao atualizar/trocar dispositivo |

**Decisão:** Persistir no banco para UX consistente.

---

## 4. Design e Arquitetura

### 4.1 Estruturas de Dados

#### Modificação em `UserEntity`

```typescript
// src/users/entities/user.entity.ts
@Column({ type: 'uuid', nullable: true })
activeMuralId: string | null;

@ManyToOne(() => MuralEntity, { nullable: true })
@JoinColumn({ name: 'activeMuralId' })
activeMural: MuralEntity | null;
```

### 4.2 APIs

#### `GET /murals/user`

Lista todos os murais do usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "murals": [
    {
      "id": "uuid",
      "name": "meu-mural",
      "displayName": "Meu Mural",
      "isActive": true
    }
  ],
  "activeMuralId": "uuid"
}
```

---

#### `PUT /murals/active/:muralId`

Define o mural ativo para o usuário autenticado.

**Headers:** `Authorization: Bearer <token>`

**Params:** `muralId` (UUID)

**Response:**

```json
{
  "message": "Active mural updated successfully",
  "activeMuralId": "uuid"
}
```

**Erros:**

- `404 Not Found` — Mural não existe
- `403 Forbidden` — Mural não pertence ao usuário

---

#### Modificação em `POST /auth/login`

Incluir `activeMuralId` na resposta de login.

**Response (atualizada):**

```json
{
  "accessToken": "jwt...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "activeMuralId": "uuid"
  }
}
```

---

## 5. Comportamento

### Fluxo 1: Registro de novo usuário

1. Usuário se registra (`POST /auth/register`)
2. Backend cria usuário
3. Backend cria mural padrão automaticamente (nome derivado do email)
4. Mural é definido como ativo
5. Retorna `accessToken` + `activeMuralId`

### Fluxo 2: Login com mural ativo existente

1. Usuário faz login
2. Backend retorna `accessToken` + `activeMuralId`
3. Cliente usa `activeMuralId` para operações subsequentes

### Fluxo 3: Usuário cria mural adicional

1. Usuário cria mural (`POST /murals/create`)
2. Backend verifica se `activeMuralId` é null
3. Se null, define automaticamente o novo mural como ativo
4. Retorna resposta com mural criado

### Fluxo 4: Troca de mural ativo

1. Usuário chama `PUT /murals/active/:muralId`
2. Backend valida que mural pertence ao usuário
3. Atualiza `activeMuralId` no `UserEntity`
4. Retorna confirmação

### Fluxo 5: Deleção de mural

1. Usuário chama `DELETE /murals/delete/:muralId`
2. Backend verifica se não é o último mural (mínimo 1 obrigatório)
3. Se for o mural ativo, define próximo disponível como ativo
4. Hard delete do mural
5. Retorna confirmação

### Regras de Negócio

- **Mínimo de 1 mural:** Usuário não pode deletar seu último mural
- **Mural padrão no registro:** Todo novo usuário recebe um mural automaticamente

---

## 6. Trade-offs e Riscos

### Persistência no banco vs. sem estado

- ✅ UX consistente entre dispositivos e sessões
- ❌ Requer migration e mais endpoints
- 🔧 Migration simples com campo nullable

### Campo no usuário vs. tabela separada

- ✅ Simplicidade (apenas 1 campo)
- ❌ Não suporta múltiplos "contextos" (ex: diferentes dispositivos)
- 🔧 Suficiente para MVP, pode evoluir depois

---

## 7. TODO - Implantação

**Status:** implemented

Todas as tarefas foram concluídas ✅

### ~~1. Modificar UserEntity~~ ✅

- **Arquivo:** `src/users/entities/user.entity.ts`
- **Ação:** Modificar
- **Descrição:** Adicionado campo `activeMuralId` (uuid, nullable) e relação `@ManyToOne` com `MuralEntity`

### ~~2. Criar migration~~ ✅

- **Não necessário:** O projeto usa `synchronize: true` em desenvolvimento, então o TypeORM sincroniza automaticamente o schema

### ~~3. Implementar UsersService~~ ✅

- **Arquivo:** `src/users/users.service.ts`
- **Ação:** Modificar
- **Descrição:** Adicionados métodos `setActiveMural(userId, muralId)` e `getActiveMural(userId)`

### ~~4. Adicionar endpoint GET /murals/user~~ ✅

- **Arquivo:** `src/murals/murals.controller.ts`
- **Ação:** Modificar
- **Descrição:** Endpoint para listar murais do usuário autenticado implementado

### ~~5. Adicionar endpoint PUT /murals/active/:muralId~~ ✅

- **Arquivo:** `src/murals/murals.controller.ts`
- **Ação:** Modificar
- **Descrição:** Endpoint para definir mural ativo implementado

### ~~6. Modificar resposta de login~~ ✅

- **Arquivo:** `src/auth/auth.service.ts`
- **Ação:** Modificar
- **Descrição:** `activeMuralId` incluído na resposta de login e register

### ~~7. Auto-definir mural ativo na criação~~ ✅

- **Arquivo:** `src/murals/murals.service.ts`
- **Ação:** Modificar
- **Descrição:** No método `create()`, verifica se usuário não tem mural ativo e define o novo mural como ativo

### ~~8. Tratar deleção de mural ativo~~ ✅

- **Arquivo:** `src/murals/murals.service.ts`
- **Ação:** Modificar
- **Descrição:** No método `softDelete()`, se o mural deletado for o ativo, define próximo disponível ou null

**Implementação concluída em:** 2026-01-17
