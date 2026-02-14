// ... Firebase Config (Same) ...

auth.onAuthStateChanged((user) => {
    if (!user || user.email !== "gauravsinghrajpoot2019@gmail.com") {
        window.location.href = "index.html"; // Agar koi aur ghusne ki koshish kare
    } else {
        loadStudents();
        loadTodayPresentCount();
    }
});

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
                    <td><input type="text" id="mobile-${doc.id}" value="${data.mobile || ''}"></td>
                    <td>
                        <select id="fee-${doc.id}">
                            <option value="Paid" ${data.fee_status === "Paid" ? "selected" : ""}>Paid</option>
                            <option value="Unpaid" ${data.fee_status === "Unpaid" ? "selected" : ""}>Unpaid</option>
                        </select>
                    </td>
                    <td><button onclick="approveStudent('${doc.id}')" class="mini-btn">Update</button></td>
                </tr>`;
        });
    });
}

// ... approveStudent aur loadTodayPresentCount functions yahan daal dein ...