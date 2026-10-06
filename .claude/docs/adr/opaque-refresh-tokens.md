# ADR: Refresh tokens opacos com hash persistido

## Contexto

Ao introduzir o fluxo de refresh token (ver [Autenticação com Refresh Token](../features/refresh-token-authentication.md)), era preciso decidir o **formato** do refresh token e **onde** armazená-lo. Os requisitos incluíam: revogação explícita (logout), detecção de roubo de token e suporte a múltiplas sessões por usuário.

## Decisão

Usar um **token opaco** (random string de 64 bytes em hex) enviado ao cliente, armazenando no banco apenas o seu **hash SHA-256**, em uma entidade dedicada `RefreshToken`. O refresh é de **uso único com rotação**: a cada renovação, o token apresentado é revogado e um novo par é emitido.

## Alternativas consideradas

| Alternativa                          | Prós                                                            | Contras                                                                 |
| ------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Token opaco + hash no banco** (escolhida) | Revogação trivial; lista de sessões ativas; detecção de roubo via rotação; o token nunca fica em claro no banco | Exige consulta ao banco a cada refresh (stateful)                       |
| JWT stateless como refresh token     | Sem consulta ao banco para validar                              | Revogação difícil (precisa de blocklist); não lista sessões facilmente  |
| Hash com bcrypt em vez de SHA-256    | Resistente a brute-force                                         | Desnecessário para um token aleatório de alta entropia; mais lento      |

## Trade-offs

- **A favor:** revogação e logout simples (marcar `isRevoked`); possibilita listar/encerrar sessões remotamente; a rotação de uso único transforma o reuso de um token roubado em sinal detectável; o segredo nunca é persistido em claro.
- **Contra:** o fluxo passa a ser stateful — cada refresh exige um lookup no banco; tokens revogados/expirados acumulam e demandam limpeza eventual.
- **Notas:** SHA-256 é suficiente porque o token de origem é aleatório e de alta entropia (não é uma senha de baixa entropia); `bcrypt` seria custo sem ganho de segurança aqui.
