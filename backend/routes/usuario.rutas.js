const express = require("express");
require("../middleware/authMiddleware");
const router = express.Router();
const usuarioController = require("../controllers/usuario.controlador");

// ruta para obtener todos los usuarios
router.get("api/usuarios", usuarioController.usuarios);
// ruta para obtener todos los usuarios de acuerdo al rol
router.get("api/usuarios/?rol", usuarioController.usuarioRol);
// ruta para obtener todos los usuarios de acuerdo al ID
router.get("api/usuarios/:id", usuarioController.usuarioID);
// ruta para crear usuario
router.post("api/usuarios", usuarioController.usuarioCrear);
// ruta para obtener borrar usuario de acuerdo al ID
router.delete("api/usuarios/:id", usuarioController.usuarioID);

module.exports = router;
