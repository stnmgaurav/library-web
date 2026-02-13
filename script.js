// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQivUhwCY7WCQFbHNCUSs_xQgLfWMs_f0",
  authDomain: "student-manager-app-8552a.firebaseapp.com",
  projectId: "student-manager-app-8552a",
  storageBucket: "student-manager-app-8552a.firebasestorage.app",
  messagingSenderId: "231788625803",
  appId: "1:231788625803:web:baa0fc5df5fd398e5e398e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// --- AUTHENTICATION LOGIC ---

function loginWithGoogle() {
    auth.signInWithPopup(provider)
    .then((result) => {
        const user = result.user;
        console.log("Logged in:", user.displayName);
        
        // ZARURI: Check karein aur naye user ka data save karein
        const userRef = db.collection("users").doc(user.uid);
        
        userRef.get().then((doc) => {
            if (!doc.exists) {
                // Agar user pehli baar aaya hai, toh default "Student" role de dein
                userRef.set({
                    display_name: user.displayName,
                    email: user.email,
                    role: "Student", 
                    fee_status: "Unpaid",
                    uid: user.uid,
                    created_time: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    checkUserRole(user);
                });
            } else {
                checkUserRole(user);
            }
        });
    }).catch((error) => {
        alert("Login Failed: " + error.message);
    });
}

function checkUserRole(user) {
    db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const role = doc.data().role;
            // UI Update
            document.getElementById('loginSection').style.display = 'none';
            if (role === "Admin") {
                document.getElementById('adminPanel').style.display = 'block';
                document.getElementById('studentPanel').style.display = 'none';
            } else {
                document.getElementById('adminPanel').style.display = 'none';
                document.getElementById('studentPanel').style.display = 'block';
                showStudentStats(user.uid);
            }
        }
    });
}

// --- ADMIN DASHBOARD LOGIC ---

function addStudent() {
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentEmail').value;
    const fees = document.getElementById('feeStatus').value;

    if(name && email) {
        db.collection("users").add({
            display_name: name,
            email: email,
            fee_status: fees,
            role: "Student",
            valid_until: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 30*24*60*60*1000)),
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            alert("Student Added Successfully!");
            document.getElementById('studentName').value = '';
            document.getElementById('studentEmail').value = '';
        });
    } else {
        alert("Please fill name and email!");
    }
}

db.collection("users").where("role", "==", "Student")
    .onSnapshot((snapshot) => {
        const listBody = document.getElementById('studentListBody');
        if(listBody) {
            listBody.innerHTML = "";
            snapshot.forEach((doc) => {
                const s = doc.data();
                listBody.innerHTML += `
                    <tr>
                        <td>${s.display_name}</td>
                        <td>${s.fee_status}</td>
                        <td><button onclick="deleteStudent('${doc.id}')" style="background:red; color:white; border:none; padding:5px; border-radius:4px;">Delete</button></td>
                    </tr>`;
            });
        }
    });

function deleteStudent(id) {
    if(confirm("Are you sure you want to remove this student?")) {
        db.collection("users").doc(id).delete();
    }
}

// --- STUDENT & QR SCANNER LOGIC ---

let html5QrCode; 

function startScanner() {
    html5QrCode = new Html5Qrcode("reader");
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, qrConfig, (decodedText) => {
        if(decodedText === "LIBRARY_GATE_01") {
            markAttendance();
            html5QrCode.stop().then(() => {
                console.log("Scanner stopped.");
            });
        }
    }).catch(err => alert("Camera permission zaroori hai!"));
}

function markAttendance() {
    const user = auth.currentUser;
    if(user) {
        db.collection("attendance").add({
            student_id: user.uid,
            name: user.displayName,
            time: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("Attendance Marked! ✅");
        });
    }
}

function showStudentStats(uid) {
    db.collection("users").doc(uid).onSnapshot((doc) => {
        if(doc.exists) {
            const data = doc.data();
            document.getElementById('daysDisplay').innerText = "Fees: " + data.fee_status;
        }
    });
}
