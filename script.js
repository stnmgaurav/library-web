// 1. Firebase Configuration (Aapka purana config)
const firebaseConfig = {
  apiKey: "AIzaSyCQivUhwCY7WCQFbHNCUSs_xQgLfWMs_f0",
  authDomain: "student-manager-app-8552a.firebaseapp.com",
  projectId: "student-manager-app-8552a",
  storageBucket: "student-manager-app-8552a.firebasestorage.app",
  messagingSenderId: "231788625803",
  appId: "1:231788625803:web:baa0fc5df5fd398e5e398e"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// --- AUTHENTICATION LOGIC ---

// 1. Pehle ye check karega ki kya user redirect hokar wapas aaya hai
auth.getRedirectResult().then((result) => {
    if (result.user) {
        console.log("Login successful after redirect");
        handleUserDatabaseEntry(result.user);
    }
}).catch((error) => {
    console.error("Redirect Error:", error.message);
});

function loginWithGoogle() {
    auth.signInWithRedirect(provider);
}

// 2. Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("Logged in as:", user.email);
        handleUserDatabaseEntry(user);
    } else {
        console.log("No user logged in.");
        showSection('loginSection');
    }
});

function handleUserDatabaseEntry(user) {
    const userRef = db.collection("users").doc(user.uid);
    
    userRef.get().then((doc) => {
        if (!doc.exists) {
            // Naya user document create karein
            userRef.set({
                display_name: user.displayName || "New Student",
                email: user.email,
                role: "Student", 
                fee_status: "Unpaid",
                uid: user.uid,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                checkUserRole(user);
            });
        } else {
            checkUserRole(user);
        }
    }).catch((error) => {
        console.error("Database Error:", error);
    });
}

function checkUserRole(user) {
    db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const role = doc.data().role;
            if (role === "Admin") {
                showSection('adminPanel');
            } else {
                showSection('studentPanel');
                showStudentStats(user.uid);
            }
        }
    });
}

// UI Section Helper (Bar-bar display change karne ki zaroorat nahi)
function showSection(sectionId) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('studentPanel').style.display = 'none';
    
    document.getElementById(sectionId).style.display = 'block';
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
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("Student Added!");
            document.getElementById('studentName').value = '';
            document.getElementById('studentEmail').value = '';
        });
    } else {
        alert("Please fill all details");
    }
}

// Real-time student list for Admin
db.collection("users").where("role", "==", "Student")
    .onSnapshot((snapshot) => {
        const listBody = document.getElementById('studentListBody');
        if(listBody) {
            listBody.innerHTML = "";
            snapshot.forEach((doc) => {
                const s = doc.data();
                // Check if doc.id is being used correctly for delete
                listBody.innerHTML += `
                <tr>
                    <td>${s.display_name}</td>
                    <td>${s.fee_status}</td>
                    <td><button onclick="deleteStudent('${doc.id}')">Delete</button></td>
                </tr>`;
            });
        }
    });

function deleteStudent(docId) {
    if(confirm("Kya aap is student ko delete karna chahte hain?")) {
        db.collection("users").doc(docId).delete().then(() => {
            console.log("Deleted");
        }).catch(err => console.log(err));
    }
}

// --- STUDENT STATS ---
function showStudentStats(uid) {
    db.collection("users").doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const display = document.getElementById('daysDisplay');
            if(display) {
                display.innerText = "Fees Status: " + (data.fee_status || "Pending");
            }
        }
    });
}

function logout() {
    auth.signOut();
}
