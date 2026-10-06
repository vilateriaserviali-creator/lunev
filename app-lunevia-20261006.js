document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://scseelymkhpmclrcetiz.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_p2FjF7oNh9mbzqCtc8Ii4w_cFwVy6Uy";
  const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) || null;

  const accountModal=document.getElementById("accountModal"), roomModal=document.getElementById("roomModal");
  const loginButton=document.getElementById("loginButton"), joinButton=document.getElementById("joinButton"), createButton=document.getElementById("createButton");
  const accountForm=document.getElementById("accountForm"), accountTitle=document.getElementById("accountTitle"), accountSubtitle=document.getElementById("accountSubtitle");
  const accountSubmit=document.getElementById("accountSubmit"), accountMessage=document.getElementById("accountMessage"), accountSwitch=document.getElementById("accountSwitch");
  const switchAccount=document.getElementById("switchAccount"), forgotPassword=document.getElementById("forgotPasswordLink");
  const nameField=document.getElementById("nameField"), registerName=document.getElementById("registerName"), registerAgree=document.getElementById("registerAgree"), agreeField=document.getElementById("agreeField");
  const email=document.getElementById("email"), password=document.getElementById("password");
  const roomContinue=document.getElementById("roomContinue");
  let mode="login", recovery=false;

  const open=(modal)=>{modal.hidden=false;document.body.classList.add("modal-open")};
  const close=(modal)=>{modal.hidden=true;if(accountModal.hidden&&roomModal.hidden)document.body.classList.remove("modal-open")};
  const message=(text,error=true)=>{accountMessage.textContent=text;accountMessage.style.color=error?"#d9b6c5":"#b8d9d1"};
  const render=()=>{
    const signup=mode==="signup";
    accountTitle.textContent=recovery?"Новый пароль":signup?"Создать аккаунт":"Войти в LUNEVIA";
    accountSubtitle.textContent=recovery?"Придумай новый пароль и вернись в LUNEVIA.":signup?"Оставь своё имя в этой вселенной — и возвращайся к своим вечерам.":"Вернись в свою киновселенную и продолжи свой вечер.";
    nameField.hidden=!signup; agreeField.hidden=!signup; forgotPassword.hidden=signup||recovery; accountSwitch.hidden=recovery;
    registerName.required=signup; registerAgree.required=signup; email.required=!recovery; password.required=true;
    accountSubmit.innerHTML=recovery?"Сохранить новый пароль <span>✦</span>":signup?"Создать аккаунт <span>✦</span>":"Войти <span>→</span>";
    accountSwitch.innerHTML=signup?'Уже есть аккаунт? <button type="button" id="switchAccount">Войти</button>':'Ещё нет аккаунта? <button type="button" id="switchAccount">Создать аккаунт</button>';
    document.getElementById("switchAccount").addEventListener("click",()=>{mode=signup?"login":"signup";recovery=false;accountForm.reset();message("");render()},{once:true});
  };
  const openAccount=(next="login")=>{mode=next;recovery=false;accountForm.reset();message("");render();open(accountModal);setTimeout(()=>{(mode==="signup"?registerName:email).focus()},60)};
  loginButton.addEventListener("click",()=>openAccount("login"));
  joinButton.addEventListener("click",()=>open(roomModal));
  createButton.addEventListener("click",()=>open(roomModal));
  document.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",()=>close(el.dataset.close==="account"?accountModal:roomModal)));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!accountModal.hidden)close(accountModal);if(!roomModal.hidden)close(roomModal)}});
  forgotPassword.addEventListener("click",async()=>{
    const value=email.value.trim().toLowerCase();
    if(!value){message("Сначала введи почту.");email.focus();return}
    if(!supabase){message("Авторизация временно недоступна.");return}
    forgotPassword.disabled=true;
    const {error}=await supabase.auth.resetPasswordForEmail(value,{redirectTo:window.location.origin+window.location.pathname});
    forgotPassword.disabled=false;
    if(error){message("Не удалось отправить письмо. Проверь почту и попробуй ещё раз.");return}
    message("Письмо для восстановления отправлено. Проверь почту.",false);
  });
  accountForm.addEventListener("submit",async e=>{
    e.preventDefault();message("");
    if(!supabase){message("Авторизация временно недоступна. Обнови страницу и попробуй ещё раз.");return}
    const mail=email.value.trim().toLowerCase(), pass=password.value;
    if(recovery){
      if(pass.length<6){message("Пароль должен содержать минимум 6 символов.");return}
      accountSubmit.disabled=true;
      const {error}=await supabase.auth.updateUser({password:pass});
      accountSubmit.disabled=false;
      if(error){message("Не получилось изменить пароль. Открой ссылку из письма ещё раз.");return}
      message("Пароль обновлён. Теперь можно войти.",false);recovery=false;mode="login";accountForm.reset();render();return;
    }
    if(mode==="signup"){
      const name=registerName.value.trim();
      if(!name||!mail||pass.length<6||!registerAgree.checked){message("Заполни все поля и подтверди условия.");return}
      accountSubmit.disabled=true;accountSubmit.innerHTML="Создаём аккаунт… <span>✦</span>";
      const {error}=await supabase.auth.signUp({email:mail,password:pass,options:{emailRedirectTo:window.location.origin+window.location.pathname,data:{full_name:name}}});
      accountSubmit.disabled=false;accountSubmit.innerHTML="Создать аккаунт <span>✦</span>";
      if(error){message(error.message);return}
      message("Аккаунт создан. Если включено подтверждение почты, проверь письмо.",false);accountForm.reset();return;
    }
    accountSubmit.disabled=true;accountSubmit.innerHTML="Входим… <span>→</span>";
    const {error}=await supabase.auth.signInWithPassword({email:mail,password:pass});
    accountSubmit.disabled=false;accountSubmit.innerHTML="Войти <span>→</span>";
    if(error){message(error.message);return}
    message("Вы вошли в LUNEVIA ✦",false);
    setTimeout(()=>close(accountModal),500);
  });
  roomContinue.addEventListener("click",()=>{roomContinue.textContent="Готово ✦"});
  supabase?.auth.getSession().then(({data})=>{if(data?.session)loginButton.textContent="Мой аккаунт ↗"});
  supabase?.auth.onAuthStateChange((event,session)=>{
    loginButton.innerHTML=session?"Мой аккаунт <span>↗</span>":"Войти <span>↗</span>";
    if(event==="PASSWORD_RECOVERY"){mode="login";recovery=true;render();open(accountModal);message("Придумай новый пароль.",false)}
  });
});