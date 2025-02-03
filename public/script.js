// Obtener docentes no validados
fetch('http://localhost:3000/admin/users')
    .then((response) => response.json())
    .then((teachers) => {
        const list = document.getElementById('teacher-list');
        list.innerHTML = ''; // Limpiar la lista antes de cargar
        teachers.forEach((teacher) => {
            const listItem = document.createElement('li');
            listItem.textContent = teacher.username;

            const validateButton = document.createElement('button');
            validateButton.textContent = 'Validar';
            validateButton.addEventListener('click', () => {
                validateTeacher(teacher.username);
            });

            listItem.appendChild(validateButton);
            list.appendChild(listItem);
        });
    })
    .catch((error) => {
        console.error('Error al obtener docentes:', error);
        alert('Error al cargar la lista de docentes');
    });

// Validar un docente
function validateTeacher(username) {
    fetch('http://localhost:3000/admin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    })
        .then((response) => response.json())
        .then((data) => {
            alert(data.message);
            location.reload(); // Recargar la lista
        })
        .catch((error) => {
            console.error('Error al validar el docente:', error);
            alert('Error al validar el docente');
        });
}
