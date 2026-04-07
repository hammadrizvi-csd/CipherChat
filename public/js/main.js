const socket = io();
const SECRET_KEY = "btech_project_secret_key";
let currentHandle = ""; let currentDisplayName = ""; let selectedHandle = ""; 
let savedContacts = JSON.parse(localStorage.getItem("myContacts")) || {};
let globalAllUsers = []; let onlineUsers = []; 
let myProfilePic = ""; 
let typingTimer; 
let cropper; 
let sentMessagesTracker = {}; 

function switchTab(tab) {
    if(tab === 'login') {
        document.getElementById('login-box').style.display = 'block'; document.getElementById('signup-box').style.display = 'none';
        document.getElementById('tab-login').classList.add('active-tab'); document.getElementById('tab-signup').classList.remove('active-tab');
    } else {
        document.getElementById('login-box').style.display = 'none'; document.getElementById('signup-box').style.display = 'block';
        document.getElementById('tab-signup').classList.add('active-tab'); document.getElementById('tab-login').classList.remove('active-tab');
    }
}

let confirmActionCallback = null;
function showConfirm(title, desc, onConfirm) {
    document.getElementById("confirm-modal").style.display = "flex"; document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-desc").textContent = desc; confirmActionCallback = onConfirm;
}
function closeConfirmModal() { document.getElementById("confirm-modal").style.display = "none"; confirmActionCallback = null; }
document.getElementById("confirm-yes-btn").addEventListener("click", () => { if(confirmActionCallback) confirmActionCallback(); closeConfirmModal(); });

function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container"); if (!container) return; 
    const toast = document.createElement("div"); toast.className = `toast ${type}`;
    const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    const token = localStorage.getItem("token"); const handle = localStorage.getItem("handle"); const name = localStorage.getItem("name");
    myProfilePic = localStorage.getItem("dp") || "";
    if (token && handle && name) { currentHandle = handle; currentDisplayName = name; setupAppUI(); }
    document.getElementById("login-password").addEventListener("keypress", (e) => { if (e.key === "Enter") login(); });
    document.getElementById("signup-password").addEventListener("keypress", (e) => { if (e.key === "Enter") initiateSignup(); });

    document.getElementById("input").addEventListener("input", () => {
        if(selectedHandle) socket.emit("typing", { to: selectedHandle, from: currentHandle });
    });
});

function toggleTheme() { document.body.classList.toggle('dark-mode'); localStorage.setItem('darkMode', document.body.classList.contains('dark-mode')); }
function validateInput(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; const phoneRegex = /^[0-9]{10}$/; 
    if (emailRegex.test(input)) return "email"; if (phoneRegex.test(input)) return "mobile"; return "invalid";
}
function getInitials(name) { return name ? name.charAt(0).toUpperCase() : "U"; }
function setupAvatar(elementId, name, picUrl) {
    const el = document.getElementById(elementId);
    if(picUrl) { el.style.backgroundImage = `url('${picUrl}')`; el.textContent = ""; } 
    else { el.style.backgroundImage = "none"; el.textContent = getInitials(name); }
}

function setupAppUI() {
    document.getElementById("my-display-name").textContent = currentDisplayName;
    document.getElementById("my-username").textContent = "@" + currentHandle;
    setupAvatar("my-avatar", currentDisplayName, myProfilePic);
    document.getElementById("auth-screen").style.display = "none"; document.getElementById("app-screen").style.display = "flex";
    socket.emit("join", currentHandle); fetchUsersList(); 
}

async function login() {
    const loginData = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value.trim();
    if (validateInput(loginData) === "invalid") return showToast("Please enter a valid Email or 10-digit Mobile Number.", "error");
    try {
        const res = await fetch("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginData, password }) });
        const data = await res.json();
        if (res.status === 200) {
            localStorage.setItem("token", data.token); localStorage.setItem("handle", data.uniqueHandle); localStorage.setItem("name", data.displayName);
            currentHandle = data.uniqueHandle; currentDisplayName = data.displayName; 
            const profileRes = await fetch(`/user-profile/${currentHandle}`); const profileData = await profileRes.json();
            if(profileData.profilePic) { myProfilePic = profileData.profilePic; localStorage.setItem("dp", myProfilePic); }
            setupAppUI(); 
        } else { showToast(data.message, "error"); }
    } catch (err) { showToast("Network error!", "error"); }
}

let tempSignupData = {};
async function initiateSignup() {
    const fullName = document.getElementById("signup-name").value.trim(); const email = document.getElementById("signup-email").value.trim().toLowerCase();
    const countryCode = document.getElementById("country-code").value; const mobile = document.getElementById("signup-mobile").value.trim(); const password = document.getElementById("signup-password").value.trim();
    if (!fullName || !password) return showToast("Name and Password are required!", "error");
    if (validateInput(email) !== "email") return showToast("Invalid Email Format!", "error");
    if (mobile && validateInput(mobile) !== "mobile") return showToast("Invalid Mobile Number! Enter 10 digits.", "error");
    const finalMobile = mobile ? countryCode + mobile : "";
    tempSignupData = { fullName, email, mobile: finalMobile, password };
    
    try {
        const res = await fetch("/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, mobile: finalMobile }) });
        const data = await res.json();
        if (res.status === 200) {
            document.getElementById("otp-modal").style.display = "flex"; document.getElementById("modal-desc").textContent = `An OTP has been sent to ${email}.`;
            showToast("OTP Sent Successfully!", "success");
        } else { showToast(data.message, "error"); }
    } catch (err) { showToast("Network error!", "error"); }
}

function openForgotPass() {
    document.getElementById("otp-modal").style.display = "flex"; document.getElementById("modal-title").textContent = "Reset Password";
    document.getElementById("modal-desc").textContent = "Enter your Email/Mobile to receive an OTP."; document.getElementById("new-pass-group").style.display = "block";
}
function closeModal(modalId) { document.getElementById(modalId).style.display = "none"; }

async function verifyOTP() {
    const otp = document.getElementById("otp-input").value;
    if(otp.length !== 6) return showToast("OTP must be exactly 6 digits.", "error");
    tempSignupData.userOtp = otp; 
    try {
        const res = await fetch("/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tempSignupData) });
        const data = await res.json();
        if (res.status === 201) {
            showToast("Signup successful! Please login.", "success"); closeModal('otp-modal');
            document.getElementById("signup-name").value = ""; document.getElementById("signup-email").value = ""; document.getElementById("signup-password").value = ""; document.getElementById("signup-mobile").value = "";
            switchTab('login');
        } else { showToast(data.message, "error"); }
    } catch (err) { showToast("Network error!", "error"); }
}

function logout() { localStorage.clear(); window.location.reload(); }

// 🔥 NAYA: Reset Chat View Function
window.resetChatView = function() {
    selectedHandle = "";
    document.getElementById("app-screen").classList.remove("chat-active"); // Mobile ke liye
    document.getElementById("empty-chat-state").style.display = "flex"; // Desktop home screen
    document.getElementById("chat-content").style.display = "none"; // Chat area hide karo
    renderUserList(); // List se active (dark) highlight hatane ke liye
};

async function openSettings() {
    document.getElementById("settings-modal").style.display = "flex"; document.getElementById("edit-name").value = currentDisplayName;
    setupAvatar("settings-dp", currentDisplayName, myProfilePic);
    document.getElementById("edit-email").value = "Loading..."; document.getElementById("edit-mobile").value = "Loading...";
    try {
        const res = await fetch(`/user-profile/${currentHandle}`); const data = await res.json();
        document.getElementById("edit-email").value = data.email || "No Email Found"; document.getElementById("edit-mobile").value = data.mobile || "No Mobile Linked";
        document.getElementById("edit-age").value = data.age || "";
    } catch(err) { document.getElementById("edit-email").value = "Error"; document.getElementById("edit-mobile").value = "Error"; }
}

function initCropper(event) {
    const file = event.target.files[0]; if(!file) return;
    const url = URL.createObjectURL(file); document.getElementById("cropper-image").src = url;
    document.getElementById("cropper-modal").style.display = "flex"; if(cropper) cropper.destroy();
    cropper = new Cropper(document.getElementById("cropper-image"), { aspectRatio: 1, viewMode: 1 }); event.target.value = ""; 
}

function closeCropper() { document.getElementById("cropper-modal").style.display = "none"; if(cropper) cropper.destroy(); }

async function uploadCroppedImage() {
    if(!cropper) return;
    cropper.getCroppedCanvas({ width: 300, height: 300 }).toBlob(async (blob) => {
        const formData = new FormData(); formData.append("dp", blob, "dp.jpg");
        showToast("Uploading Image...", "success"); closeCropper();
        try {
            const res = await fetch(`/upload-dp/${currentHandle}`, { method: "POST", body: formData }); const data = await res.json();
            if(res.status === 200) {
                myProfilePic = data.profilePic; localStorage.setItem("dp", myProfilePic);
                setupAvatar("settings-dp", currentDisplayName, myProfilePic); setupAvatar("my-avatar", currentDisplayName, myProfilePic);
                showToast("Profile Picture Updated!", "success");
            }
        } catch(err) { showToast("Error uploading image", "error"); }
    });
}

async function updateProfile() {
    const newName = document.getElementById("edit-name").value.trim(); const newAge = document.getElementById("edit-age").value.trim();
    if(!newName) return showToast("Name cannot be empty", "error");
    try {
        const res = await fetch("/update-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: currentHandle, newName, age: newAge }) });
        if(res.status === 200) {
            currentDisplayName = newName; localStorage.setItem("name", newName); document.getElementById("my-display-name").textContent = newName;
            setupAvatar("my-avatar", newName, myProfilePic); showToast("Profile updated!", "success"); closeModal('settings-modal');
        }
    } catch (err) { showToast("Error updating profile", "error"); }
}

async function deleteAccount() {
    showConfirm("Delete Account", "This will permanently delete your account! Are you sure?", async () => {
        try {
            const res = await fetch("/delete-account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: currentHandle }) });
            if(res.status === 200) { showToast("Account deleted.", "success"); setTimeout(() => logout(), 1500); }
        } catch (err) { showToast("Error", "error"); }
    });
}

function deleteContact(handle, event) {
    event.stopPropagation(); 
    showConfirm("Delete Contact & Chat", "Are you sure? This will remove the contact and permanently delete all your messages with them.", async () => {
        try {
            await fetch(`/delete-chat/${currentHandle}/${handle}`, { method: 'DELETE' });
            delete savedContacts[handle]; localStorage.setItem("myContacts", JSON.stringify(savedContacts));
            
            // 🔥 NAYA FIX: Agar delete kiya gaya user open tha, to screen reset kar do
            if(selectedHandle === handle) {
                resetChatView(); 
            } else {
                renderUserList(); 
            }
            showToast("Contact & Chat Deleted", "success");
        } catch(e) { showToast("Error deleting chat", "error"); }
    });
}

async function fetchUsersList() { const res = await fetch("/users"); globalAllUsers = await res.json(); renderUserList(); }

function renderUserList() {
    const usersListElement = document.getElementById("users-list"); usersListElement.innerHTML = ""; 
    const searchTerm = document.getElementById("search-input").value.trim().toLowerCase();
    let displayUsers = globalAllUsers.filter(user => {
        if (user.uniqueHandle === currentHandle) return false; 
        if (searchTerm === "") return !!savedContacts[user.uniqueHandle];
        else return user.uniqueHandle.toLowerCase().includes(searchTerm) || user.displayName.toLowerCase().includes(searchTerm);
    });
    displayUsers.sort((a, b) => { return (onlineUsers.includes(b.uniqueHandle) ? 1 : 0) - (onlineUsers.includes(a.uniqueHandle) ? 1 : 0); });
    
    displayUsers.forEach(user => {
        const li = document.createElement("li");
        const hasCustomName = !!savedContacts[user.uniqueHandle]; 
        const displayNameToShow = hasCustomName ? savedContacts[user.uniqueHandle] : user.displayName;
        const isOnline = onlineUsers.includes(user.uniqueHandle);
        const deleteBtnHtml = hasCustomName ? `<button class="delete-btn" onclick="deleteContact('${user.uniqueHandle}', event)" title="Delete Chat & Contact"><i class="fa-solid fa-trash"></i></button>` : '';

        if (user.uniqueHandle === selectedHandle) li.classList.add("active-user");

        li.innerHTML = `
            <div style="display:flex; align-items:center; width:100%; gap: 15px;">
                <div class="avatar" style="background-size:cover; background-position:center; ${user.profilePic ? `background-image:url('${user.profilePic}')` : ''}">${user.profilePic ? '' : getInitials(displayNameToShow)}</div>
                <div class="list-user-info" style="flex:1;">
                    <span class="list-name">${displayNameToShow}</span>
                    ${!hasCustomName ? `<span class="list-username">@${user.uniqueHandle}</span>` : ""}
                </div>
                ${isOnline ? `<span class="status-dot online"></span>` : ``}
                ${deleteBtnHtml}
            </div>
        `;
        li.onclick = () => { 
            selectedHandle = user.uniqueHandle;
            if (!savedContacts[user.uniqueHandle]) { savedContacts[user.uniqueHandle] = user.displayName; localStorage.setItem("myContacts", JSON.stringify(savedContacts)); } 
            document.getElementById("search-input").value = ""; renderUserList(); openChatWith(user.uniqueHandle, displayNameToShow, user.profilePic, isOnline); 
        };
        usersListElement.appendChild(li);
    });
}

async function openChatWith(handle, displayName, picUrl, isOnline) {
    document.getElementById("app-screen").classList.add("chat-active"); document.getElementById("empty-chat-state").style.display = "none"; document.getElementById("chat-content").style.display = "flex";
    setupAvatar("chat-avatar", displayName, picUrl); document.getElementById("chat-title").textContent = displayName; 
    
    const statusEl = document.getElementById("chat-subtitle"); statusEl.textContent = isOnline ? "Online" : "Offline"; statusEl.style.color = isOnline ? "var(--primary)" : "var(--text-muted)";
    document.getElementById("input").disabled = false; document.getElementById("send-btn").disabled = false;
    
    const messagesDiv = document.getElementById("messages"); messagesDiv.innerHTML = "<div style='text-align:center; margin-top:20px;'><i class='fa-solid fa-spinner fa-spin'></i> Loading...</div>"; 
    
    try { 
        const res = await fetch(`/messages/${currentHandle}/${selectedHandle}`); const history = await res.json(); messagesDiv.innerHTML = ""; 
        history.forEach(msg => { 
            try {
                let finalMsg = ""; if(msg.fileUrl) { finalMsg = "FILE"; } else { const bytes = CryptoJS.AES.decrypt(msg.text, SECRET_KEY); finalMsg = bytes.toString(CryptoJS.enc.Utf8); }
                displayMessage(finalMsg, msg.sender === currentHandle ? 'sent' : 'received', msg.fileUrl, msg.fileName, msg.timestamp, msg._id, msg.status); 
            } catch (e) {} 
        }); 
        socket.emit("mark_read", { from: selectedHandle, to: currentHandle });
    } catch (err) { messagesDiv.innerHTML = "Error loading history."; }
}

function openRenameModal() { document.getElementById("rename-modal").style.display = "flex"; document.getElementById("rename-input").value = savedContacts[selectedHandle] || ""; }
function confirmRename() {
    const newName = document.getElementById("rename-input").value.trim();
    if (newName) { savedContacts[selectedHandle] = newName; localStorage.setItem("myContacts", JSON.stringify(savedContacts)); renderUserList(); document.getElementById("chat-title").textContent = newName; closeModal('rename-modal'); showToast("Contact Renamed!", "success"); }
}

async function uploadChatFile(event) {
    const file = event.target.files[0]; if(!file) return;
    const formData = new FormData(); formData.append("file", file); showToast("Sending File...", "success");
    try {
        const res = await fetch("/upload-file", { method: "POST", body: formData }); const data = await res.json();
        if(res.status === 200) {
            const timestamp = new Date().toISOString(); const tempMsgId = "temp_" + Date.now();
            socket.emit("private message", { to: selectedHandle, from: currentHandle, message: "", fileUrl: data.fileUrl, fileName: data.fileName, timestamp: timestamp, msgId: tempMsgId });
            displayMessage("FILE", 'sent', data.fileUrl, data.fileName, timestamp, tempMsgId, "sent");
        }
    } catch(err) { showToast("File send failed", "error"); }
}

function formatTime(isoString) { const date = new Date(isoString); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

window.deleteSingleMessage = function(msgId) {
    showConfirm("Delete Message", "Delete this message for everyone?", () => {
        socket.emit("delete_message", { msgId, to: selectedHandle });
    });
};

function displayMessage(text, type, fileUrl = "", fileName = "", timestamp = new Date().toISOString(), msgId = "", status = "sent") {
    const messagesDiv = document.getElementById("messages"); const div = document.createElement("div"); 
    div.classList.add("msg-bubble", type === 'sent' ? "msg-sent" : "msg-received"); 
    if(msgId) div.id = "msg-" + msgId;
    
    let contentHtml = "";
    if(fileUrl) {
        if(fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) { contentHtml = `<a href="${fileUrl}" target="_blank"><img src="${fileUrl}" style="max-width:200px; border-radius:5px; margin-top:5px;"></a>`; } 
        else { contentHtml = `<a href="${fileUrl}" target="_blank" style="color: inherit; text-decoration: underline;"><i class="fa-solid fa-file"></i> ${fileName}</a>`; }
    } else { contentHtml = `<span>${text}</span>`; }
    
    let tickHtml = "";
    if(type === 'sent') {
        let tickColor = status === "read" ? "#3b82f6" : "#9ca3af";
        let tickIcon = status === "sent" ? "fa-check" : "fa-check-double";
        tickHtml = `<i class="fa-solid ${tickIcon} msg-status" style="color:${tickColor}; font-size: 0.7rem; margin-left: 5px;"></i>`;
    }
    
    let deleteIconHtml = type === 'sent' ? `<div class="msg-delete-icon" onclick="deleteSingleMessage('${msgId}')" title="Delete for Everyone"><i class="fa-solid fa-trash"></i></div>` : '';

    div.innerHTML = `${deleteIconHtml} ${contentHtml} <div style="display:flex; align-items:center; align-self:flex-end; margin-top:4px;"><span class="msg-time" style="font-size:0.65rem; color:#888;">${formatTime(timestamp)}</span> ${tickHtml}</div>`;
    messagesDiv.appendChild(div); messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

document.getElementById("form-container").addEventListener("submit", (e) => {
    e.preventDefault(); const msg = document.getElementById("input").value.trim();
    if (msg && selectedHandle) { 
        const encryptedMsg = CryptoJS.AES.encrypt(msg, SECRET_KEY).toString(); 
        const timestamp = new Date().toISOString(); const tempMsgId = "temp_" + Date.now();
        socket.emit("private message", { to: selectedHandle, from: currentHandle, message: encryptedMsg, fileUrl: "", fileName: "", timestamp: timestamp, msgId: tempMsgId }); 
        displayMessage(msg, 'sent', "", "", timestamp, tempMsgId, "sent"); 
        document.getElementById("input").value = ""; document.getElementById("input").focus(); 
    }
});

socket.on("user_updated", () => { fetchUsersList(); });

socket.on("message_status", ({ msgId, status }) => {
    const msgEl = document.getElementById("msg-" + msgId);
    if(msgEl) {
        const tickIcon = msgEl.querySelector(".msg-status");
        if(tickIcon) { tickIcon.className = `fa-solid ${status === 'sent' ? 'fa-check' : 'fa-check-double'} msg-status`; tickIcon.style.color = status === 'read' ? "#3b82f6" : "#9ca3af"; }
    }
});

socket.on("messages_read", ({ by }) => {
    if(selectedHandle === by) { document.querySelectorAll(".msg-sent .msg-status").forEach(el => { el.className = "fa-solid fa-check-double msg-status"; el.style.color = "#3b82f6"; }); }
});

socket.on("message_deleted", ({ msgId }) => {
    const msgEl = document.getElementById("msg-" + msgId);
    if(msgEl) { msgEl.innerHTML = `<span style="font-style:italic; color:#888; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-ban"></i> This message was deleted</span>`; }
});

socket.on("online_users", (activeUsersArray) => { 
    onlineUsers = activeUsersArray; renderUserList(); 
    if(selectedHandle) {
        const statusEl = document.getElementById("chat-subtitle"); const isOnline = onlineUsers.includes(selectedHandle);
        if(statusEl.textContent !== "typing...") { statusEl.textContent = isOnline ? "Online" : "Offline"; statusEl.style.color = isOnline ? "var(--primary)" : "var(--text-muted)"; }
    }
});

socket.on("typing", (data) => {
    if (data.from === selectedHandle) {
        const statusEl = document.getElementById("chat-subtitle"); statusEl.textContent = "typing..."; statusEl.style.color = "var(--primary)";
        clearTimeout(typingTimer); typingTimer = setTimeout(() => { const isOnline = onlineUsers.includes(selectedHandle); statusEl.textContent = isOnline ? "Online" : "Offline"; statusEl.style.color = isOnline ? "var(--primary)" : "var(--text-muted)"; }, 1500);
    }
});

socket.on("private message", (data) => {
    if (!savedContacts[data.from]) { savedContacts[data.from] = data.from; localStorage.setItem("myContacts", JSON.stringify(savedContacts)); renderUserList(); }
    if (data.from === selectedHandle) { 
        let finalMsg = ""; if(data.fileUrl) { finalMsg = "FILE"; } else { const bytes = CryptoJS.AES.decrypt(data.message, SECRET_KEY); finalMsg = bytes.toString(CryptoJS.enc.Utf8); }
        displayMessage(finalMsg, 'received', data.fileUrl, data.fileName, data.timestamp, data.dbId, "read"); 
        socket.emit("mark_read", { from: data.from, to: currentHandle });
    } else { showToast("New message from " + (savedContacts[data.from] || data.from), "success"); }
});
