const Account = document.querySelector(".acnt");
const Account2 = document.querySelector(".acnt2");
const Accountpage = document.getElementById("account")
 console.log(Account);
 
 Account.addEventListener('click', ()=>{
    Accountpage.style.transform = "translateX(-0%)"
 })
 Account2.addEventListener('click', ()=>{
    Accountpage.style.transform = "translateX(100%)"
 })