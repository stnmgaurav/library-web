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
    // Redirect method sabse best hai mobile aur vercel ke liye
    auth.signInWithRedirect(provider);
}

// YE SABSE ZARURI HISSA HAI: Ye har bar check karega login status
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log("User is logged in:", user.email);
        handleUserDatabaseEntry(user);
    } else {
        console.log("No user logged in.");
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('studentPanel').style.display = 'none';
    }
});

function handleUserDatabaseEntry(user) {
    const userRef = db.collection("users").doc(user.uid);
    
    userRef.get().then((doc) => {
        if (!doc.exists) {
            // Naya user document create karein
            userRef.set({
                display_name: user.displayName,
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
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("Student Added!");
            document.getElementById('studentName').value = '';
            document.getElementById('studentEmail').value = '';
        });
    }
}

// Student list real-time
db.collection("users").where("role", "==", "Student")
    .onSnapshot((snapshot) => {
        const listBody = document.getElementById('studentListBody');
        if(listBody) {
            listBody.innerHTML = "";
            snapshot.forEach((doc) => {
                const s = doc.data();
                listBody.innerHTML += `<tr><td>${s.display_name}</td><td>${s.fee_status}</td><td><button onclick="deleteStudent('${doc.id}')">Delete</button></td></tr>`;
            });
        }
    });

// --- STUDENT STATS ---
function showStudentStats(uid) {
    db.collection("users").doc(uid).onSnapshot((doc) => {
        if (doc.exists) {
            document.getElementById('daysDisplay').innerText = "Fees Status: " + doc.data().fee_status;
        }
    });
}
