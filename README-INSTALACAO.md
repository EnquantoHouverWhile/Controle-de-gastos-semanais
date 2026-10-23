# Meu Controle 4.0 — implantação

## 1. Antes de tudo
1. Exporte um backup seguro na versão 3.0.
2. NÃO apague o app anterior nem limpe os dados do Safari.
3. Publique no MESMO endereço GitHub Pages da versão anterior.

## 2. Firebase (gratuito dentro das cotas)
1. Crie projeto em https://console.firebase.google.com/ e escolha o plano Spark.
2. Em Build > Authentication > Sign-in method, habilite **Email/Password**.
3. Em Authentication > Settings > Authorized domains, adicione seu domínio `SEUUSUARIO.github.io`.
4. Crie Firestore Database em modo de produção; nas Rules, substitua pelas regras do `firestore.rules`, e clique Publicar.
5. Em Configurações do projeto > Geral > Seus apps, crie uma aplicação Web.
6. Copie `apiKey`, `authDomain`, `projectId`, `appId` para `firebase-config.js`.
7. Envie os arquivos do aplicativo à raiz do repositório GitHub Pages; **não envie backups, senhas nem conta de serviço**.
8. Acesse HTTPS, entre ou crie conta, ative seu cofre local, e use **Enviar cofre agora**.
9. Num segundo navegador, entre com as mesmas credenciais; se não houver dados locais, o cofre é baixado automaticamente. Digite a senha do cofre para abri-lo.

## Sobre o Face ID
**Não implementado nesta entrega.** Firebase Authentication não oferece, diretamente neste código, cadastro e validação de passkeys WebAuthn com controle de dispositivos. Isso exige um serviço de validação (backend) adicional. A senha da conta será exigida no primeiro login do novo navegador; nos navegadores com sessão persistente, o Firebase pode manter a sessão sem pedi-la novamente. Não interprete esse comportamento como proteção por Face ID.

## Privacidade e limites
- Somente o cofre criptografado é sincronizado. Sem cofre ativo, dados permanecem locais.
- A senha de criptografia do cofre não é enviada ao servidor. Cada navegador precisa dessa senha para descriptografar.
- O app não possui fusão de alterações simultâneas: o último envio pode substituir o cofre na nuvem. Não edite em dois aparelhos ao mesmo tempo; exporte backups.
- Sem conexão, o salvamento local continua; depois de reconectar e estar autenticado, uma alteração gera novo envio. Para preservar *todas* as alterações de todos os dispositivos, será necessário implementar fila de mudanças e resolução de conflitos.
- Recomenda-se um segundo fator de autenticação na conta Firebase quando disponível e testes reais de segurança antes de armazenar informações críticas.
- Teste criação de conta, sincronização, restaurar, sair e entrar, bloqueio e backup antes de substituir sua versão principal.
