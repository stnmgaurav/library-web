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

let authResolved = false;

// --- AUTHENTICATION LOGIC ---

function loginWithGoogle() {
  auth.signInWithRedirect(provider).catch((error) => {
    console.error("Login Redirect Error:", error.message);
    alert("Login start nahi ho paaya. Kripya dobara try karein.");
  });
}

// Redirect result ko consume karte hain taaki errors surface ho jayein.
auth.getRedirectResult().catch((error) => {
  console.error("Redirect Result Error:", error.message);
});

// Auth state observer
// Important: login section tabhi dikhana hai jab auth state resolve ho jaye.
auth.onAuthStateChanged((user) => {
  authResolved = true;

  if (user) {
    console.log("Logged in as:", user.email);
    handleUserDatabaseEntry(user);
    return;
  }

  console.log("No user logged in.");
  showSection('loginSection');
});

function handleUserDatabaseEntry(user) {
  const userRef = db.collection("users").doc(user.uid);

  userRef.get().then((doc) => {
    if (!doc.exists) {
      // Naya user document create karein
      return userRef.set({
        display_name: user.displayName || "New Student",
        email: user.email,
        role: "Student",
        fee_status: "Unpaid",
        uid: user.uid,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }).then(() => {
    checkUserRole(user);
  }).catch((error) => {
    console.error("Database Error:", error);
    // Agar database read/write fail ho, tab bhi login page par na atke.
    showSection('studentPanel');
  });
}

function checkUserRole(user) {
  db.collection("users").doc(user.uid).get().then((doc) => {
    if (!doc.exists) {
      showSection('studentPanel');
      return;
    }

    const role = doc.data().role;
    if (role === "Admin") {
      showSection('adminPanel');
    } else {
      showSection('studentPanel');
      showStudentStats(user.uid);
    }
  }).catch((error) => {
    console.error("Role Check Error:", error);
    showSection('studentPanel');
  });
}

// UI Section Helper (Bar-bar display change karne ki zaroorat nahi)
function showSection(sectionId) {
  const loginSection = document.getElementById('loginSection');
  const adminPanel = document.getElementById('adminPanel');
  const studentPanel = document.getElementById('studentPanel');

  if (!loginSection || !adminPanel || !studentPanel) {
    return;
  }

  loginSection.style.display = 'none';
  adminPanel.style.display = 'none';
  studentPanel.style.display = 'none';

  // Safety: auth resolve hone se pehle login UI flash avoid karein.
  if (sectionId === 'loginSection' && !authResolved) {
    return;
  }

  document.getElementById(sectionId).style.display = 'block';
}

// --- ADMIN DASHBOARD LOGIC ---

function addStudent() {
  const name = document.getElementById('studentName').value;
  const email = document.getElementById('studentEmail').value;
  const fees = document.getElementById('feeStatus').value;

  if (name && email) {
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
    if (listBody) {
      listBody.innerHTML = "";
      snapshot.forEach((doc) => {
        const s = doc.data();
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
  if (confirm("Kya aap is student ko delete karna chahte hain?")) {
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
      if (display) {
        display.innerText = "Fees Status: " + (data.fee_status || "Pending");
      }
    }
  });
}

function logout() {
  auth.signOut();
}
