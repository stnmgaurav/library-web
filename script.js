// ================= FIREBASE CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyDf1kBSxrMAn84T2fyt5ipc7GZ3iMSA7hg",
    authDomain: "librarywebapp-e65ac.firebaseapp.com",
    projectId: "librarywebapp-e65ac",
    storageBucket: "librarywebapp-e65ac.firebasestorage.app",
    messagingSenderId: "710619179809",
    appId: "1:710619179809:web:6d130adbca76669f226c60"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let html5QrCode;
const ADMIN_EMAIL = "gauravsinghrajpoot2019@gmail.com";

// ================= LOGIN & AUTH =================

function loginWithGoogle() {
    auth.signInWithPopup(provider).catch(error => alert(error.message));
}

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('userWelcome').innerText = `Hi, ${user.displayName.split(' ')[0]}!`;
        handleUser(user);
    } else {
        showLogin();
    }
});

function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    if(document.getElementById('adminPanel')) document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('studentPanel').style.display = 'none';
    document.getElementById('userWelcome').innerText = "";
}

function handleUser(user) {
    const userRef = db.collection("users").doc(user.uid);

    userRef.get().then((doc) => {
        if (user.email === ADMIN_EMAIL) {
            if (!doc.exists) {
                userRef.set({
                    name: user.displayName, email: user.email, role: "Admin",
                    approved: true, fee_status: "Paid", uid: user.uid,
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => loadAdminPanel());
            } else { loadAdminPanel(); }
        } else {
            if (!doc.exists) {
                userRef.set({
                    name: user.displayName, email: user.email, mobile: "",
                    role: "Student", approved: false, fee_status: "Unpaid",
                    uid: user.uid, created_at: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => loadStudentPanel({ approved: false, fee_status: "Unpaid" }));
            } else { loadStudentPanel(doc.data()); }
        }
    });
}

// ================= ADMIN LOGIC =================

async function loadAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    const loadingState = document.getElementById('loadingState');
    
    if(loadingState) loadingState.style.display = 'none';
    if(adminPanel) adminPanel.style.display = 'block';
    
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('studentPanel').style.display = 'none';

    await checkAndResetFees(); // 30 days check
    loadStats();
    loadStudents();
}

async function checkAndResetFees() {
    const now = new Date();
    const snapshot = await db.collection("users").where("fee_status", "==", "Paid").get();
    
    snapshot.forEach(async (doc) => {
        const data = doc.data();
        if (data.last_paid_date) {
            const lastPaid = new Date(data.last_paid_date);
            const diffDays = Math.ceil(Math.abs(now - lastPaid) / (1000 * 60 * 60 * 24));

            if (diffDays > 30) {
                await db.collection("users").doc(doc.id).update({ fee_status: "Unpaid" });
            }
        }
    });
}

function loadStats() {
    db.collection("users").where("role", "==", "Student").get().then(snap => {
        document.getElementById("totalStudentsCount").innerText = snap.size;
    });

    db.collection("users").where("fee_status", "==", "Paid").get().then(snap => {
        document.getElementById("paidFeesCount").innerText = snap.size;
    });

    const today = new Date().toISOString().split("T")[0];
    db.collection("attendance").where("date", "==", today).get().then(snap => {
        document.getElementById("totalPresent").innerText = snap.size;
    });
}

function loadStudents() {
    const tableBody = document.getElementById("studentListBody");
    tableBody.innerHTML = "Loading...";
    db.collection("users").where("role", "==", "Student").get().then((snapshot) => {
        tableBody.innerHTML = "";
        snapshot.forEach((doc) => {
            const data = doc.data();
            tableBody.innerHTML += `
                <tr>
                    <td>${data.name}</td>
                    <td><input type="text" id="mobile-${doc.id}" value="${data.mobile || ''}" style="width:100px"></td>
                    <td>
                        <select id="fee-${doc.id}">
                            <option value="Paid" ${data.fee_status === "Paid" ? "selected" : ""}>Paid</option>
                            <option value="Unpaid" ${data.fee_status === "Unpaid" ? "selected" : ""}>Unpaid</option>
                        </select>
                    </td>
                    <td>${data.last_paid_date || 'N/A'}</td>
                    <td><button onclick="approveStudent('${doc.id}')" class="mini-btn">Update</button></td>
                </tr>`;
        });
    });
}

function approveStudent(uid) {
    const mobileValue = document.getElementById("mobile-" + uid).value;
    const feeValue = document.getElementById("fee-" + uid).value;
    const updateData = { mobile: mobileValue, approved: true, fee_status: feeValue };

    if (feeValue === "Paid") {
        updateData.last_paid_date = new Date().toISOString().split("T")[0];
    }

    db.collection("users").doc(uid).update(updateData).then(() => {
        alert("Updated Successfully!");
        loadStats();
        loadStudents();
    });
}

// ================= STUDENT LOGIC =================

function loadStudentPanel(userData) {
    document.getElementById('loginSection').style.display = 'none';
    if(document.getElementById('adminPanel')) document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('studentPanel').style.display = 'block';

    const feeText = document.getElementById("feeDisplay");
    const scanBtn = document.getElementById("startScanBtn");
    const statusIcon = document.getElementById("statusIcon");

    if (!userData.approved) {
        statusIcon.innerHTML = '<i class="fas fa-clock" style="color:#f59e0b; font-size:40px;"></i>';
        feeText.innerText = "Waiting for admin approval";
        scanBtn.style.display = "none";
    } else if (userData.fee_status !== "Paid") {
        statusIcon.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444; font-size:40px;"></i>';
        feeText.innerText = "Please pay fees to scan";
        scanBtn.style.display = "none";
    } else {
        statusIcon.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981; font-size:40px;"></i>';
        feeText.innerText = "Fees Paid ✅";
        scanBtn.style.display = "block";
        loadTodayHours(auth.currentUser.uid);
        loadHistory(auth.currentUser.uid);
    }
}

// ================= QR SCANNER & ATTENDANCE =================

function startScanner() {
    document.getElementById("startScanBtn").style.display = "none";
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            if(decodedText === "LIBRARY_ENTRY") {
                // 1. Scanner pause karo turant
                html5QrCode.pause(true);
                window.navigator.vibrate(200);
                markAttendance(auth.currentUser.uid);
            } else {
                alert("Invalid QR Code!");
            }
        }
    ).catch(err => alert("Camera Error: " + err));
}

function markAttendance(uid) {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const timeString = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    db.collection("attendance").where("uid", "==", uid).where("date", "==", dateString).get().then((snapshot) => {
        if (snapshot.empty) {
            // New Check-In
            db.collection("attendance").add({
                uid: uid, date: dateString, checkIn: timeString, checkOut: "", totalHours: "",
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => { 
                alert("Check-In Success! ✅"); 
                stopScanner(); 
                location.reload(); 
            });
        } else {
            const doc = snapshot.docs[0];
            const data = doc.data();

            if (!data.checkOut) {
                // 2. 2-Minute Cooldown Check
                const checkInTime = data.created_at.toDate();
                const diffMinutes = Math.floor((new Date() - checkInTime) / (1000 * 60));

                if (diffMinutes < 2) {
                    alert("Wait! Kam se kam 2 min baad check-out karein.");
                    html5QrCode.resume();
                    return;
                }

                // Check-Out
                const hours = ((new Date() - checkInTime) / (1000 * 60 * 60)).toFixed(2);
                db.collection("attendance").doc(doc.id).update({
                    checkOut: timeString, totalHours: hours
                }).then(() => { 
                    alert("Check-Out Success! 👋"); 
                    stopScanner(); 
                    location.reload(); 
                });
            } else { 
                alert("Today's attendance already completed!"); 
                stopScanner(); 
            }
        }
    }).catch(err => {
        alert("Error: " + err.message);
        html5QrCode.resume();
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => html5QrCode.clear());
        document.getElementById("startScanBtn").style.display = "block";
    }
}

function loadTodayHours(uid) {
    const today = new Date().toISOString().split("T")[0];
    db.collection("attendance").where("uid", "==", uid).where("date", "==", today).get().then(snap => {
        if (!snap.empty) {
            const d = snap.docs[0].data();
            document.getElementById("todayHours").innerText = `Today: ${d.checkIn} - ${d.checkOut || 'Active'} | ${d.totalHours || '0'} hrs`;
        }
    });
}

function loadHistory(uid) {
    const table = document.getElementById("historyBody");
    table.innerHTML = "";
    db.collection("attendance").where("uid", "==", uid).orderBy("created_at", "desc").limit(10).get().then(snap => {
        snap.forEach(doc => {
            const d = doc.data();
            table.innerHTML += `<tr><td>${d.date.slice(5)}</td><td>${d.checkIn}</td><td>${d.checkOut || '-'}</td><td>${d.totalHours || '-'}</td></tr>`;
        });
    });
}

function logout() { auth.signOut().then(() => location.reload()); }
