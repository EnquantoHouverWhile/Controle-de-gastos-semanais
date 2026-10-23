import { firebaseConfig } from './firebase-config.js';
const $=id=>document.getElementById(id);
const status=(s)=>{$('cloudStatus').textContent=s;};
const gateMsg=s=>{const el=$('accountMessage');if(el)el.textContent=s;};
const gate=locked=>document.body.classList.toggle('auth-required',locked);
const accountBusy=busy=>{for(const id of ['accountLogin','accountSignup'])$(id).disabled=busy;};
const missing=Object.values(firebaseConfig).some(v=>String(v).includes('COLE_'));
let auth,db,currentUser=null,docRef=null,ready=false,queue=Promise.resolve(),hydrating=false;
function error(e){console.error(e);const msg='Falha: '+(e.code||e.message||'erro desconhecido');status(msg);gateMsg(msg);}
if(missing){status('Para conectar: preencha firebase-config.js e publique as regras do Firestore.');gateMsg('Configuração do Firebase incompleta. O aplicativo permanecerá bloqueado.');}
else {start().catch(error);}
async function start(){
 const [{initializeApp},{getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,setDoc,serverTimestamp}] = await Promise.all([
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
 ]);
 const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);
 $('accountForm').onsubmit=async ev=>{ev.preventDefault();accountBusy(true);gateMsg('Entrando...');try{await signInWithEmailAndPassword(auth,$('accountEmail').value.trim(),$('accountPassword').value);$('accountPassword').value=''}catch(e){error(e)}finally{accountBusy(false)}};
 $('accountSignup').onclick=async()=>{if(!$('accountForm').reportValidity())return;accountBusy(true);gateMsg('Criando conta...');try{await createUserWithEmailAndPassword(auth,$('accountEmail').value.trim(),$('accountPassword').value);$('accountPassword').value=''}catch(e){error(e)}finally{accountBusy(false)}};
 await setPersistence(auth,browserLocalPersistence);
 async function fetchRemote(){if(!docRef)throw Error('Faça login primeiro');const snap=await getDoc(docRef);return snap.exists()?snap.data().packet:null;}
 async function push(packet){if(!currentUser||!packet||!ready)return;await setDoc(docRef,{packet,updatedAt:serverTimestamp()});status('Cofre criptografado sincronizado.');}
 window.addEventListener('mc-vault-updated',ev=>{
  if(!ready||hydrating)return;
  const packet=ev.detail;queue=queue.then(()=>push(packet)).catch(error);
 });
 $('cloudLogin').onclick=async()=>{try{status('Entrando...');await signInWithEmailAndPassword(auth,$('cloudEmail').value.trim(),$('cloudPassword').value);$('cloudPassword').value=''}catch(e){error(e)}};
 $('cloudSignup').onclick=async()=>{try{status('Criando conta...');await createUserWithEmailAndPassword(auth,$('cloudEmail').value.trim(),$('cloudPassword').value);$('cloudPassword').value=''}catch(e){error(e)}};
 $('cloudLogout').onclick=async()=>{try{ready=false;gate(true);gateMsg('Sessão encerrada. Entre novamente.');await signOut(auth)}catch(e){error(e)}};
 $('cloudUpload').onclick=async()=>{try{const p=window.MeuControleCloud.getPacket();if(!p)throw Error('Ative o cofre criptografado primeiro.');const remote=await fetchRemote();if(remote&&!confirm('Sobrescrever os dados na nuvem com o cofre deste aparelho? Faça backup antes se houver diferenças.'))return;await push(p)}catch(e){error(e)}};
 $('cloudDownload').onclick=async()=>{try{const remote=await fetchRemote();if(!remote)throw Error('Ainda não existe um cofre na nuvem.');if(!confirm('Substituir o cofre local pelo backup criptografado na nuvem? Faça backup local antes.'))return;hydrating=true;await window.MeuControleCloud.importEncrypted(remote);status('Cofre baixado. Digite a senha do cofre para abrir.')}catch(e){error(e)}finally{hydrating=false}};
 onAuthStateChanged(auth,async user=>{
   ready=false;currentUser=user;
   $('cloudLoggedIn').classList.toggle('hidden',!user);$('cloudLoggedOut').classList.toggle('hidden',!!user);
   if(!user){docRef=null;gate(true);status('Entre na sua conta para acessar o aplicativo.');gateMsg('Entre com e-mail e senha ou crie sua conta.');return;}
   gate(false);gateMsg('');
   $('cloudAccount').textContent='Conectado: '+(user.email||'conta autenticada');
   docRef=doc(db,'users',user.uid,'private','vault');
   try {
     status('Verificando cofre da conta...');
     const remote=await fetchRemote();
     if(!remote){status('Conta conectada. Ative o cofre e envie seus dados.');ready=true;return;}
     if(!window.MeuControleCloud.hasLocalData()){
       hydrating=true;await window.MeuControleCloud.importEncrypted(remote);hydrating=false;
       status('Cofre recebido. Digite a senha do cofre para abrir.');
     }else{
       status('Conta conectada. Há dados locais e na nuvem: escolha Enviar ou Baixar, após fazer backup.');
     }
     ready=true;
   }catch(e){hydrating=false;error(e)}
 });
}
