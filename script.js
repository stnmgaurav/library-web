// ================= FIREBASE SDK IMPORTS (v9 Modular) =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, 
    query, where, serverTimestamp, addDoc, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { 
    getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// ================= NEW FIREBASE CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyCQivUhwCY7WCQFbHNCUSs_xQgLfWMs_f0",
    authDomain: "student-manager-app-8552a.firebaseapp.com",
    projectId: "student-manager-app-8552a",
    storageBucket: "student-manager-app-8552a.firebasestorage.app",
    messagingSenderId: "231788625803",
    appId: "1:231788625803:web:baa0fc5df5fd398e5e398e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let html5QrCode;
const ADMIN_EMAIL = "gauravsinghrajpoot2019@gmail.com";

// ================= LOGIN & AUTH =================

window.loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login failed: " + error.message);
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('userWelcome').innerText = `Hi, ${user.displayName.split(' ')[0]}!`;
        handleUser(user);
    } else {
        showLogin();
    }
});

function showLogin() {
    const loginSec = document.getElementById('loginSection');
    const studentSec = document.getElementById('studentPanel');
    const adminSec = document.getElementById('adminPanel');

    if (loginSec) loginSec.style.display = 'block';
    if (studentSec) studentSec.style.display = 'none';
    if (adminSec) adminSec.style.display = 'none';
    
    document.getElementById('userWelcome').innerText = "";
}

async function handleUser(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (user.email === ADMIN_EMAIL) {
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName, email: user.email, role: "Admin",
                approved: true, fee_status: "Paid", uid: user.uid,
                created_at: serverTimestamp()
            });
        }
        loadAdminPanel();
    } else {
        if (!userSnap.exists()) {
            const userData = {
                name: user.displayName, email: user.email, mobile: "",
                role: "Student", approved: false, fee_status: "Unpaid",
                uid: user.uid, created_at: serverTimestamp()
            };
            await setDoc(userRef, userData);
            loadStudentPanel(userData);
        } else {
            loadStudentPanel(userSnap.data());
        }
    }
}

// ================= ADMIN LOGIC =================

async function loadAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.style.display = 'block';
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('studentPanel').style.display = 'none';
        
        await checkAndResetFees();
        loadStats();
        loadStudents();
    }
}

async function checkAndResetFees() {
    const now = new Date();
    const q = query(collection(db, "users"), where("fee_status", "==", "Paid"));
    const snapshot = await getDocs(q);
    
    snapshot.forEach(async (userDoc) => {
        const data = userDoc.data();
        if (data.last_paid_date) {
            const lastPaid = new Date(data.last_paid_date);
            const diffDays = Math.ceil(Math.abs(now - lastPaid) / (1000 * 60 * 60 * 24));
            if (diffDays > 30) {
                await updateDoc(doc(db, "users", userDoc.id), { fee_status: "Unpaid" });
            }
        }
    });
}

async function loadStats() {
    const studentsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "Student")));
    const paidSnap = await getDocs(query(collection(db, "users"), where("fee_status", "==", "Paid")));
    
    if(document.getElementById("totalStudentsCount")) document.getElementById("totalStudentsCount").innerText = studentsSnap.size;
    if(document.getElementById("paidFeesCount")) document.getElementById("paidFeesCount").innerText = paidSnap.size;

    const today = new Date().toISOString().split("T")[0];
    const attSnap = await getDocs(query(collection(db, "attendance"), where("date", "==", today)));
    if(document.getElementById("totalPresent")) document.getElementById("totalPresent").innerText = attSnap.size;
}

async function loadStudents() {
    const tableBody = document.getElementById("studentListBody");
    if(!tableBody) return;
    
    tableBody.innerHTML = "Loading...";
    const q = query(collection(db, "users"), where("role", "==", "Student"));
    const snapshot = await getDocs(q);
    
    tableBody.innerHTML = "";
    snapshot.forEach((userDoc) => {
        const data = userDoc.data();
        tableBody.innerHTML += `
            <tr>
                <td>${data.name}</td>
                <td><input type="text" id="mobile-${userDoc.id}" value="${data.mobile || ''}" style="width:100px"></td>
                <td>
                    <select id="fee-${userDoc.id}">
                        <option value="Paid" ${data.fee_status === "Paid" ? "selected" : ""}>Paid</option>
                        <option value="Unpaid" ${data.fee_status === "Unpaid" ? "selected" : ""}>Unpaid</option>
                    </select>
                </td>
                <td>${data.last_paid_date || 'N/A'}</td>
                <td><button onclick="approveStudent('${userDoc.id}')" class="mini-btn">Update</button></td>
            </tr>`;
    });
}

window.approveStudent = async (uid) => {
    const mobileValue = document.getElementById("mobile-" + uid).value;
    const feeValue = document.getElementById("fee-" + uid).value;
    const updateData = { mobile: mobileValue, approved: true, fee_status: feeValue };

    if (feeValue === "Paid") {
        updateData.last_paid_date = new Date().toISOString().split("T")[0];
    }

    await updateDoc(doc(db, "users", uid), updateData);
    alert("Updated Successfully!");
    loadStats();
    loadStudents();
};

// ================= STUDENT LOGIC =================

function loadStudentPanel(userData) {
    document.getElementById('loginSection').style.display = 'none';
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

window.startScanner = () => {
    document.getElementById("startScanBtn").style.display = "none";
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            if(decodedText === "LIBRARY_ENTRY") {
                html5QrCode.pause(true);
                window.navigator.vibrate(200);
                markAttendance(auth.currentUser.uid);
            } else {
                alert("Invalid QR Code!");
            }
        }
    ).catch(err => alert("Camera Error: " + err));
};

async function markAttendance(uid) {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const timeString = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const q = query(collection(db, "attendance"), where("uid", "==", uid), where("date", "==", dateString));
    const snap = await getDocs(q);

    if (snap.empty) {
        await addDoc(collection(db, "attendance"), {
            uid, date: dateString, checkIn: timeString, checkOut: "", totalHours: "",
            created_at: serverTimestamp()
        });
        alert("Check-In Success! ✅");
        location.reload();
    } else {
        const attDoc = snap.docs[0];
        const data = attDoc.data();

        if (!data.checkOut) {
            const checkInTime = data.created_at.toDate();
            const diffMinutes = Math.floor((new Date() - checkInTime) / (1000 * 60));

            if (diffMinutes < 2) {
                alert("Wait! Kam se kam 2 min baad check-out karein.");
                html5QrCode.resume();
                return;
            }

            const hours = ((new Date() - checkInTime) / 3600000).toFixed(2);
            await updateDoc(doc(db, "attendance", attDoc.id), {
                checkOut: timeString, totalHours: hours
            });
            alert("Check-Out Success! 👋");
            location.reload();
        } else {
            alert("Today's attendance already completed!");
        }
    }
}

async function loadTodayHours(uid) {
    const today = new Date().toISOString().split("T")[0];
    const q = query(collection(db, "attendance"), where("uid", "==", uid), where("date", "==", today));
    const snap = await getDocs(q);
    if (!snap.empty) {
        const d = snap.docs[0].data();
        document.getElementById("todayHours").innerText = `Today: ${d.checkIn} - ${d.checkOut || 'Active'} | ${d.totalHours || '0'} hrs`;
    }
}

async function loadHistory(uid) {
    const table = document.getElementById("historyBody");
    if(!table) return;
    
    table.innerHTML = "";
    const q = query(collection(db, "attendance"), where("uid", "==", uid), orderBy("created_at", "desc"), limit(10));
    const snap = await getDocs(q);
    snap.forEach(doc => {
        const d = doc.data();
        table.innerHTML += `<tr><td>${d.date.slice(5)}</td><td>${d.checkIn}</td><td>${d.checkOut || '-'}</td><td>${d.totalHours || '-'}</td></tr>`;
    });
}

window.logout = () => signOut(auth).then(() => location.reload());
