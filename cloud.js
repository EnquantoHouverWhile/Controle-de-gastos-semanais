import { firebaseConfig } from './firebase-config.js';
const $ = id => document.getElementById(id);
const say = message => { if ($('accountMessage')) $('accountMessage').textContent = message; if ($('cloudStatus')) $('cloudStatus').textContent = message; };
const gate = locked => document.body.classList.toggle('auth-required', locked);
const busy = value => { for (const id of ['accountLogin', 'accountSignup']) if ($(id)) $(id).disabled = value; };
const timeout = (promise, ms, description) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(description)), ms))]);
let auth, db, currentUser = null, docRef = null, ready = false, hydrating = false, queue = Promise.resolve();
const OWNER_KEY = 'meu-controle-account-owner-v1';
let knownRemote = null;
let accountGeneration = 0;
function ownerCheck(uid) {
 const owner = localStorage.getItem(OWNER_KEY);
 if(owner && owner !== uid) throw new Error('Há dados locais vinculados a outra conta neste navegador. Por segurança, o acesso foi bloqueado. Exporte seu backup na conta original e use outro perfil/navegador para a nova conta. NÃO limpe os dados sem fazer backup.');
 if(!owner) localStorage.setItem(OWNER_KEY, uid);
}
const fingerprint = p => p ? JSON.stringify(p) : null;
const messages = {
 'auth/email-already-in-use':'Esse e-mail já está cadastrado. Use Entrar.',
 'auth/invalid-email':'Confira o endereço de e-mail.',
 'auth/weak-password':'Escolha uma senha mais forte (pelo menos 6 caracteres).',
 'auth/invalid-credential':'E-mail ou senha incorretos.',
 'auth/wrong-password':'E-mail ou senha incorretos.',
 'auth/user-not-found':'Conta não encontrada. Toque em Criar conta.',
 'auth/operation-not-allowed':'Ative E-mail/senha em Firebase Authentication → Sign-in method.',
 'auth/unauthorized-domain':'Autorize enquantohouverwhile.github.io em Authentication → Settings → Authorized domains.',
 'auth/network-request-failed':'Não foi possível comunicar com o Firebase. Confira sua conexão ou bloqueadores de conteúdo.',
 'permission-denied':'Firestore negou acesso. Publique as regras de segurança do banco.'
};
const error = e => { console.error('[Meu Controle]',e); say('Erro: '+(messages[e?.code] || messages[e?.code?.replace('firestore/','')] || e?.message || 'Erro inesperado.')); };
// O manipulador é instalado ANTES de baixar a biblioteca Firebase. Assim a tela nunca recarrega silenciosamente.
$('accountForm').addEventListener('submit', e => {e.preventDefault(); say('Conectando ao Firebase…');});
$('accountSignup').addEventListener('click', () => say('Conectando ao Firebase…'));
gate(true);
if (Object.values(firebaseConfig).some(v => !v || String(v).includes('COLE_'))) {
 say('Configuração do Firebase incompleta. Confira firebase-config.js.');
} else {
 start().catch(error);
}
async function start(){
 say('Carregando autenticação segura…');
 const [{initializeApp},{getAuth,setPersistence,browserLocalPersistence,inMemoryPersistence,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,runTransaction,serverTimestamp}] = await timeout(Promise.all([
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
 ]), 18000, 'Não foi possível carregar o Firebase. Verifique a conexão, o cache ou os bloqueadores de conteúdo do Safari.');
 const app = initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app); window.__mcAuthLoaded=true;
 let submitting=false;
 async function authenticate(create){
  if(submitting)return;
  if(!$('accountForm').reportValidity())return;
  submitting=true; busy(true); say(create?'Criando sua conta…':'Verificando e-mail e senha…');
  try {
   await timeout((create?createUserWithEmailAndPassword:signInWithEmailAndPassword)(auth,$('accountEmail').value.trim(),$('accountPassword').value),25000,'O Firebase demorou para responder. Confira sua internet e tente novamente.');
   $('accountPassword').value='';
   say('Conta autenticada. Abrindo seus dados…');
  } catch(e){error(e);} finally {submitting=false;busy(false);}
 }
 $('accountForm').addEventListener('submit', e=>{e.preventDefault();authenticate(false);});
 $('accountSignup').addEventListener('click', ()=>authenticate(true));
 try {await timeout(setPersistence(auth,browserLocalPersistence), 10000, 'A persistência da sessão não respondeu.');}
 catch(e){console.warn('Persistência local indisponível',e);try{await setPersistence(auth,inMemoryPersistence);say('O iPhone não permitiu manter a sessão salva; será necessário entrar novamente.');}catch(err){error(err);}}
 async function fetchRemote(){if(!docRef)throw Error('Faça login primeiro.');const ref=docRef;const snapshot=await runTransaction(db, async transaction=> transaction.get(ref), {maxAttempts:3});return snapshot.exists()?snapshot.data().packet:null;}
 async function push(packet, force=false){
  if(!currentUser||!docRef||!packet||!ready)throw Error('Conta não autorizada para enviar dados.');
  if(packet.format!=='meu-controle-vault'||!packet.ciphertext)throw Error('Cofre inválido para envio.');
  const uid=currentUser.uid, ref=docRef, generation=accountGeneration;
  const snapshot = await runTransaction(db, async tx=>{
   const snap=await tx.get(ref);
   const previous=snap.exists()?snap.data().packet:null;
   if(!force && fingerprint(previous)!==fingerprint(knownRemote))
    throw Error('CONFLITO: o cofre na nuvem mudou em outro aparelho. Nenhum dado foi sobrescrito. Faça backup e escolha Baixar cofre antes de continuar.');
   if(!force && previous && knownRemote===null)
    throw Error('Conflito: já existe um cofre remoto. Faça backup e decida entre Baixar ou Enviar manualmente.');
   tx.set(ref,{packet,updatedAt:serverTimestamp()});
   return packet;
  },{maxAttempts:3});
  if(currentUser?.uid===uid && generation===accountGeneration){knownRemote=snapshot;say('Cofre criptografado sincronizado.');}
 }
 window.addEventListener('mc-vault-updated', ev=>{if(!ready||hydrating)return;queue=queue.then(()=>push(ev.detail)).catch(error);});
 $('cloudLogin').onclick=async()=>{try{say('Entrando…');await signInWithEmailAndPassword(auth,$('cloudEmail').value.trim(),$('cloudPassword').value);$('cloudPassword').value='';}catch(e){error(e);}};
 $('cloudSignup').onclick=async()=>{try{say('Criando conta…');await createUserWithEmailAndPassword(auth,$('cloudEmail').value.trim(),$('cloudPassword').value);$('cloudPassword').value='';}catch(e){error(e);}};
 $('cloudLogout').onclick=async()=>{try{ready=false;gate(true);await signOut(auth);location.reload();}catch(e){error(e);}};
 $('cloudUpload').onclick=async()=>{try{const p=window.MeuControleCloud.getPacket();if(!p)throw Error('Ative o cofre criptografado primeiro.');const remote=await fetchRemote();if(remote&&!confirm('Sobrescrever o cofre na nuvem? Faça backup antes.'))return;await push(p,true);}catch(e){error(e);}};
 $('cloudDownload').onclick=async()=>{try{const remote=await fetchRemote();if(!remote)throw Error('Ainda não existe um cofre na nuvem.');if(!confirm('Substituir os dados locais pelo cofre na nuvem? Faça backup antes.'))return;hydrating=true;await window.MeuControleCloud.importEncrypted(remote);knownRemote=remote;say('Cofre baixado. Desbloqueie-o com sua senha.');}catch(e){error(e);}finally{hydrating=false;}};
 onAuthStateChanged(auth, async user=>{
  ready=false;accountGeneration++;knownRemote=null;currentUser=user;
  $('cloudLoggedIn').classList.toggle('hidden',!user);$('cloudLoggedOut').classList.toggle('hidden',!!user);
  if(!user){docRef=null;gate(true);say('Entre com e-mail e senha ou crie uma conta.');return;}
  $('cloudAccount').textContent='Conectado: '+(user.email||'conta autenticada');
  try{ownerCheck(user.uid);}catch(e){gate(true);error(e);return;}
  docRef=doc(db,'users',user.uid,'private','vault');
  // Nunca liberar o painel antes de verificar o Firestore.
  gate(true);
  try {
   say('Verificando cofre da conta…');
   const remote=await timeout(fetchRemote(),15000,'Não foi possível consultar o Firestore. Confira as regras e a conexão.');
   knownRemote=remote;
   if(!remote){say('Conta conectada. Nenhum cofre encontrado na nuvem. Ative o cofre para sincronizar.');ready=true;gate(false);return;}
   if(!window.MeuControleCloud.hasLocalData()){
    hydrating=true;await window.MeuControleCloud.importEncrypted(remote);hydrating=false;
    say('Cofre recebido. Digite a senha do cofre para abrir.');
   } else if(fingerprint(window.MeuControleCloud.getPacket())!==fingerprint(remote)) { knownRemote=null; say('Há cofres diferentes neste aparelho e na nuvem. Sincronização automática bloqueada. Faça backup e escolha Enviar ou Baixar manualmente.'); } else say('Conta conectada. Cofre local e remoto estão iguais.');
   ready=true;gate(false);
  }catch(e){hydrating=false;ready=false;gate(true);error(e);}
 },error);
 say('Verificando sua sessão…');
}
