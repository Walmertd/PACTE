document.addEventListener('DOMContentLoaded', () => {
    const userList = document.getElementById('user-list');

    // Función para obtener usuarios no validados
    function fetchUsers() {
        fetch('http://localhost:3000/admin/users') // Llamada al servidor para obtener los usuarios
            .then(response => response.json())
            .then(users => {
                userList.innerHTML = ''; // Limpiar la lista antes de agregar los nuevos usuarios
                if (users.length === 0) {
                    userList.innerHTML = '<p>No hay docentes pendientes de validación.</p>';
                }
                users.forEach(user => {
                    const li = document.createElement('li');
                    li.textContent = user.username;

                    // Crear el botón para validar al usuario
                    const button = document.createElement('button');
                    button.textContent = 'Validar';
                    button.onclick = () => validateUser(user.username);
                    li.appendChild(button);
                    userList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Error al obtener los usuarios:', error);
            });
    }

    // Función para validar al docente
    function validateUser(username) {
        fetch('http://localhost:3000/admin/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message); // Mostrar mensaje de validación
            fetchUsers(); // Actualizar la lista de docentes después de la validación
        })
        .catch(error => {
            console.error('Error al validar el docente:', error);
        });
    }

    // Llamada a la función para cargar la lista de usuarios al cargar la página
    fetchUsers();
});
