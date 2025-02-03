const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Base de datos
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error(err.message);
    else console.log('Conectado a la base de datos SQLite');
});

db.serialize(() => {
    // Crear tabla de usuarios si no existe
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            validated INTEGER DEFAULT 0
        )
    `);

    // Crear tabla de certificados si no existe
    db.run(`
        CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            name TEXT,
            generated_by TEXT
        )
    `);

    // Crear tabla de docentes si no existe
    db.run(`
        CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            email TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Carpeta pública para archivos estáticos

// Ruta para registrar usuarios
app.post('/register', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    db.run(
        `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
        [username, password, role],
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al registrar el usuario' });
            res.json({ message: 'Registro exitoso' });
        }
    );
});

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
        `SELECT * FROM users WHERE username = ? AND password = ?`,
        [username, password],
        (err, user) => {
            if (err) return res.status(500).json({ message: 'Error en el servidor' });
            if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

            if (user.role === 'teacher' && user.validated === 0) {
                return res.status(403).json({ message: 'Esperando validación del administrador' });
            }

            res.json({
                message: 'Inicio de sesión exitoso',
                role: user.role,
                username: user.username
            });
        }
    );
});

// Ruta para obtener certificados por nombre
app.get('/certificates', (req, res) => {
    const { name } = req.query;
    db.all(`SELECT * FROM certificates WHERE name LIKE ?`, [`%${name}%`], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor' });
        res.json(rows);
    });
});

// Ruta para generar certificados
app.post('/certificates', (req, res) => {
    const { name, generated_by } = req.body;
    const code = `CERT-${Date.now()}`;
    if (!name || !generated_by) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    db.run(
        `INSERT INTO certificates (code, name, generated_by) VALUES (?, ?, ?)`,
        [code, name, generated_by],
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al generar el certificado' });
            res.json({ message: 'Certificado generado exitosamente', code, name });
        }
    );
});

// Ruta para obtener docentes no validados
app.get('/admin/users', (req, res) => {
    db.all(`SELECT id, username FROM users WHERE role = 'teacher' AND validated = 0`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor' });
        res.json(rows);
    });
});

// Ruta para validar usuarios
app.post('/admin/validate', (req, res) => {
    const { username } = req.body;
    db.run(
        `UPDATE users SET validated = 1 WHERE username = ? AND (role = 'teacher' OR role = 'editor')`,
        [username],
        function (err) {
            if (err) return res.status(500).json({ message: 'Error al validar el usuario' });
            if (this.changes === 0) return res.status(404).json({ message: 'Usuario no encontrado o ya validado' });
            res.json({ message: `Usuario ${username} validado` });
        }
    );
});

// Rutas para gestionar docentes
app.post('/teachers', (req, res) => {
    const { name, subject, email } = req.body;
    if (!name || !subject || !email) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    db.run(
        `INSERT INTO teachers (name, subject, email) VALUES (?, ?, ?)`,
        [name, subject, email],
        (err) => {
            if (err) return res.status(500).json({ message: 'Error al agregar el docente' });
            res.json({ message: 'Docente agregado exitosamente' });
        }
    );
});

app.get('/teachers', (req, res) => {
    db.all(`SELECT * FROM teachers`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error en el servidor' });
        res.json(rows);
    });
});

app.put('/teachers/:id', (req, res) => {
    const { id } = req.params;
    const { name, subject, email } = req.body;

    if (!name || !subject || !email) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    db.run(
        `UPDATE teachers SET name = ?, subject = ?, email = ? WHERE id = ?`,
        [name, subject, email, id],
        function (err) {
            if (err) return res.status(500).json({ message: 'Error al actualizar el docente' });
            if (this.changes === 0) return res.status(404).json({ message: 'Docente no encontrado' });
            res.json({ message: 'Docente actualizado exitosamente' });
        }
    );
});

app.delete('/teachers/:id', (req, res) => {
    const { id } = req.params;

    db.run(
        `DELETE FROM teachers WHERE id = ?`,
        [id],
        function (err) {
            if (err) return res.status(500).json({ message: 'Error al eliminar el docente' });
            if (this.changes === 0) return res.status(404).json({ message: 'Docente no encontrado' });
            res.json({ message: 'Docente eliminado exitosamente' });
        }
    );
});

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
