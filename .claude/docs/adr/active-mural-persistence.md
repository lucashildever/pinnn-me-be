# ADR: Persistência do mural ativo

## Contexto

Um usuário pode ter múltiplos murais e precisa de uma noção de "mural ativo" — qual mural está editando no momento. Era necessário decidir **onde** guardar essa escolha e **como** modelá-la. Ver a feature em [Mural Ativo](../features/active-mural.md).

## Decisão

Persistir o mural ativo no banco, como um único campo `activeMuralId` (uuid, nullable) na `UserEntity`, com relação `@ManyToOne` para `MuralEntity`.

## Alternativas consideradas

### Onde guardar

| Alternativa            | Prós                              | Contras                                                  |
| ---------------------- | --------------------------------- | -------------------------------------------------------- |
| **Persistir no banco** (escolhida) | Mantém o contexto entre sessões e dispositivos | Mais complexo; exige endpoints e sincronização de schema |
| Apenas no frontend     | Simples                           | Perde o contexto ao atualizar a página ou trocar de dispositivo |

### Como modelar

| Alternativa                    | Prós                         | Contras                                                       |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------- |
| **Campo no usuário** (escolhida) | Simplicidade (apenas 1 campo) | Não suporta múltiplos "contextos" simultâneos (ex.: por dispositivo) |
| Tabela separada de contexto    | Suporta múltiplos contextos  | Mais complexo do que o necessário para o MVP                  |

## Trade-offs

- **A favor:** UX consistente entre dispositivos e sessões; modelagem mínima (um campo) e fácil de evoluir.
- **Contra:** requer sincronização de schema e endpoints adicionais; não cobre contextos simultâneos por dispositivo.
- **Mitigações:** campo `nullable` garante retrocompatibilidade com usuários existentes; o modelo de campo único é suficiente para o MVP e pode evoluir para uma tabela de contexto se a necessidade surgir.
