# Auditoria de segurança — Meu Controle 4.1.3 (23/10/2026)

## Escopo
Revisão estática dos arquivos da versão 4.1.2, alterações corretivas 4.1.3, validação sintática de JavaScript, comparação do caminho das regras e testes estáticos. Não houve acesso autenticado ao Firebase real, nem pentest do serviço em produção.

## Achados e ações

1. **ALTO — Cofre local compartilhado entre contas no mesmo perfil (parcialmente mitigado).** O app mantém `meu-controle-encrypted-v3` e chaves legadas sem identificação de UID. Adicionada marca de proprietário da instalação e bloqueio por UID diferente. Para múltiplos usuários reais no mesmo navegador, é necessária arquitetura de dados segregados por UID e migração com consentimento. Não apague a marca de proprietário sem backup.
2. **ALTO — Sobrescrita de dados por outro dispositivo (mitigado para escrita automática).** Introduzida transação Firestore com comparação do último pacote conhecido. Em caso de mudança remota, a gravação automática é rejeitada. O botão manual de envio ainda permite substituição intencional após confirmação. Não há mesclagem de históricos: essa é uma limitação funcional importante.
3. **MÉDIO — Regras permissivas para metadados (endurecido).** As novas regras validam esquema completo do envelope, tamanho dos campos, timestamp do servidor e dono. É obrigatório publicar `firestore.rules` no Console Firebase; apenas colocar no GitHub não as ativa.
4. **MÉDIO — Logout deixa dados descriptografados na memória até recarregar (mitigado).** Após `signOut`, a página recarrega para limpar estado JS. Não protege de XSS ou extensões no mesmo contexto.
5. **ALTO — Criptografia não protege contra script malicioso distribuído no GitHub Pages (permanece).** A aplicação recebe código JavaScript do repositório público e depende de CDN do Firebase. Contas com acesso de escrita ao repositório devem usar MFA, revisão e proteção de branch; idealmente usar dependências fixadas/auto-hospedadas e CSP estrita testada.
6. **MÉDIO — Disponibilidade offline incompleta (permanece).** SDK Firebase vem de CDN, e o app ainda depende da inicialização da autenticação online no fluxo de primeiro acesso. Não há login offline confiável.
7. **MÉDIO — Chave derivada de senha (permanece).** PBKDF2-SHA256 com 310 mil iterações e AES-GCM; a resistência é limitada pela força da senha do cofre. Perda da senha não tem recuperação automática.
8. **MÉDIO — Falta de rate limiting e verificação de e-mail personalizada (permanece).** Firebase tem controles próprios, mas recomenda-se ativar proteção contra enumeração de e-mails, verificação de e-mail e App Check após validar compatibilidade com PWA.
9. **MÉDIO — Conflitos de sincronização (parcialmente mitigado).** Escrita automática agora recusa divergências em vez de sobrescrever; sem merge de lançamentos, edições offline concorrentes ainda exigem decisão manual.

## Testes realizados
- `node --check` para `cloud.js`, `sw.js` e blocos inline do `index.html`: aprovados.
- Conferência do caminho `users/{uid}/private/vault` com as Firestore Rules: correspondente.
- Conferência do envelope criptografado (formato, versão, KDF, IV, salt e ciphertext) com o esquema validado pelas Rules: correspondente.
- Fluxos de autenticação, persistência, read/write em Firebase, erros de rede e comportamentos em Safari: **não testados em produção**. As regras exigem publicação e teste com duas contas separadas usando o emulador Firebase.

## Testes recomendados antes de usar gastos reais
1. Publicar regras, entrar com conta A e criar cofre com gasto fictício.
2. Confirmar no Console que o documento correto surgiu, sem valores em texto claro.
3. Entrar com a conta B no mesmo navegador: painel deve continuar bloqueado.
4. Tentar leitura do cofre A com conta B via emulador de Rules: deve ser negada.
5. Entrar com A em outro navegador e recuperar com a senha do cofre.
6. Editar no primeiro e segundo aparelho, testar conflito e confirmar ausência de substituição silenciosa.
7. Testar logout, atualização, acesso sem internet e backup/restauração.

**Decisão:** versão 4.1.3 reduz exposição, mas **não deve ser considerada auditada/segura para produção financeira** sem testes reais das Rules, autenticação, migração de dados e dependências. Faça backup antes da atualização.
