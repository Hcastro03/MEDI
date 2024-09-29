/**
 * Módulo de controlador para el módulo de gestión de citas en una aplicación de gestión de consultorios médicos.
 * @module citaController
 */

const CitaModel = require("../models/cita.model");
const UsuarioModel = require("../models/usuario.model");
const mongoose = require("mongoose");
require("../config/db");
const {ObjectId} = require("mongodb");

/**
 * Objeto que contiene los controladores para el módulo de gestión de citas.
 * @namespace controller
 */
const controller = {};

/**
 * Número máximo de citas permitidas por día.
 * @constant {number}
 */
const CITASMAX = 8;

/**
 * Controlador para obtener la lista de citas.
 * @function
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Devuelve una promesa que resuelve en un objeto JSON con la lista de citas o un objeto JSON con el error.
 */
controller.citas = async (req, res) => {
  const citas = await CitaModel.aggregate([  {
    $lookup: {
      from: "usuarios",
      localField: "doctor_id",
      foreignField: "_id",
      as: "doctor"
    }
  },
    {
      $lookup: {
        from: "usuarios",
        localField: "paciente_id",
        foreignField: "_id",
        as: "paciente"
      }
    },
    {
      $unwind: "$doctor"
    },
    {
      $unwind: "$paciente"
    },
    {
      $project: {
        _id: 1,
        fecha: 1,
        hora: 1,
        motivo: 1,
        estado: 1,
        createdAt: 1,
        "doctor._id": 1,
        "doctor.nombre": 1,
        "doctor.primer_apellido": 1,
        "paciente._id": 1,
        "paciente.nombre": 1,
        "paciente.primer_apellido": 1
      }
    }
  ]);
  try {
    if (!citas) {
      return res.status(404).send({ msg: "Cita no encontrada" });
    } else {
      res.status(200).json(citas);
    }
  } catch (error) {
    res
      .status(500)
      // const errors = controlDeErrores(error);
      .send(`${error} ---> citas no encontrada`);
  }
};

/**
 * Controlador para crear una nueva cita.
 * @function
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Una promesa que resuelve en un objeto JSON con la nueva cita o un objeto JSON con el error.
 */
controller.crearCita = async (req, res) => {
  console.log(req.body);
  const {
    paciente_id,
    doctor_id,
    fecha,
    hora,
    motivo,
    estado,
    notificaciones,
  } = req.body;

  try {
    const cita = await new CitaModel({
      paciente_id,
      doctor_id,
      fecha,
      hora,
      motivo,
      estado,
      notificaciones,
    }).save();
    // respuesta JSON. Se puede usar como notificacion:
    res.status(201).json(cita);
  } catch (error) {
    // const errors = controlDeErrores(error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Controlador para obtener detalles de una cita específica.
 * @function
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Una promesa que resuelve en una vista renderizada con los detalles de la cita o un mensaje de error.
 */
controller.unicaCita = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    return res.status(400).json({ error: "Se requiere el ID de la Cita" });
  }

  console.log(_id);
  console.log(typeof (_id));

  try {
    const cita = await CitaModel.aggregate([{
      $match: {
        _id: new ObjectId(_id)
      }
      },
      {
      $lookup: {
        from: "usuarios",
        localField: "doctor_id",
        foreignField: "_id",
        as: "doctor"
      }
    },
      {
        $lookup: {
          from: "usuarios",
          localField: "paciente_id",
          foreignField: "_id",
          as: "paciente"
        }
      },
      {
        $unwind: "$doctor"
      },
      {
        $unwind: "$paciente"
      },
      {
        $project: {
          _id: 1,
          fecha: 1,
          hora: 1,
          motivo: 1,
          estado: 1,
          createdAt: 1,
          "doctor._id": 1,
          "doctor.nombre": 1,
          "doctor.primer_apellido": 1,
          "paciente._id": 1,
          "paciente.nombre": 1,
          "paciente.primer_apellido": 1
        }
      }
    ])

    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.status(200).json(cita);
  } catch (error) {
    console.error("Error al buscar la cita:", error);
    // const errors = controlDeErrores(error);
    res.status(500).json({ error: "Error al buscar la cita" });
  }
};

/**
 * Controlador para actualizar los detalles de una cita específica.
 * @function
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Una promesa que resuelve en una redirección a la página de citas o un mensaje de error.
 */

controller.actualizarCita = async (req, res) => {
  const { _id, ...datos } = req.body;
  console.log("ID de la cita a actualizar:", _id);
  console.log("Datos de actualización:", datos);

  if (!_id) {
    return res.status(400).json({ error: "Se requiere el ID de la Cita" });
  }

  try {
    const resultado = await CitaModel.updateOne(
      { _id: _id },
      {
        $set: datos,
        $currentDate: { updatedAt: true },
      },
      { runValidators: true }
    );

    console.log("Resultado de la actualización:", resultado);

    if (resultado.matchedCount === 0) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    if (resultado.modifiedCount === 0) {
      return res
        .status(200)
        .json({ message: "No se realizaron cambios en la cita" });
    }

    // Obtener la cita actualizada para enviarla en la respuesta
    const citaActualizada = await CitaModel.findById(_id);
    res.json(citaActualizada);
  } catch (error) {
    console.error("Error al actualizar la cita:", error);
    res
      .status(500)
      .json({ error: "Error al actualizar la cita", details: error.message });
  }
};

/**
 * Controlador para eliminar una cita existente.
 * @function
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Devuelve una promesa que resuelve en una respuesta HTTP indicando si la cita fue cancelada o un error.
 */
controller.eliminarCita = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    return res.status(400).json({ error: "Se requiere el ID de la Cita" });
  }

  try {
    const resultado = await CitaModel.findByIdAndDelete(_id);

    if (!resultado) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.status(200).json(resultado);
  } catch (error) {
    console.error("Error al eliminar la cita:", error);
    // const errors = controlDeErrores(error);
    res.status(500).json({ error: "Error al eliminar la cita" });
  }
};

/**
 * Controlador para obtener todos los tipos de citas relacionadas a paciente específico.
 * @function
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Devuelve una promesa que resuelve en una respuesta HTTP con las citas del paciente o un error.
 */
controller.citasPaciente = async (req, res) => {
  const { paciente_id } = req.body;

  // Validando que el ID pertenece a un Paciente
  if (!paciente_id) {
    return res.status(400).json({ error: "Se requiere el ID del Paciente" });
  }

  try {
    const paciente = await UsuarioModel.findOne({
      _id: paciente_id,
      rol: "paciente",
    });

    if (!paciente) {
      return res
        .status(404)
        .json({ error: "El Id proporcionado no pertenece a un paciente" });
    }
  } catch (error) {
    console.error("Error al validar paciente:", error);
    // const errors = controlDeErrores(error);
    res.status(500).json({ error: "Error al comprobar el paciente" });
  }

  // Buscar y devolver las citas del paciente
  try {
    const citas = await CitaModel.aggregate([{
      $match: {
        paciente_id: new ObjectId(paciente_id)
      }
    },
        {
          $lookup: {
            from: "usuarios",
            localField: "paciente_id",
            foreignField: "_id",
            as: "paciente"
          }
        },
        {
          $unwind: "$paciente"
        },
      {
        $project: {
          "paciente._id": 1,
          "paciente.nombre": 1,
          "paciente.primer_apellido": 1,
          _id: 1,
          fecha: 1,
          hora: 1,
          motivo: 1,
          estado: 1,
          createdAt: 1
        }
      }
  ]);

    if (!citas) {
      return res.status(404).json({ error: "El paciente no tiene citas" });
    }

    res.status(200).json(citas);
  } catch (error) {
    console.error("Error al buscar la cita:", error);
    // const errors = controlDeErrores(error);
    res.status(500).json({ error: "Error al buscar la cita" });
  }
};

/**
 * Controlador para obtener las fechas disponibles para un doctor específico.
 * @function
 * @async
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Devuelve una promesa que resuelve en una respuesta HTTP con las fechas disponibles o un error.
 */

controller.citasDisponiblesDoctor = async (req, res) => {
  const { doctor_id, fecha } = req.body;
  // Rango de fechas a buscar = 14 días
  let RANGO_DE_FECHAS = 14 * 24 * 60 * 60 * 1000;
  let fechaInicial = new Date(fecha);
  let fechaFinal = new Date(fechaInicial.getTime() + RANGO_DE_FECHAS);
  let doctor;
  let citas;
  let fechasDisponibles = [];

  console.log("Doctor ID:", doctor_id);
  console.log("Fecha:", fecha);

  // Validar que todos los parámetros necesarios estén presentes
  if (!doctor_id || !fecha) {
    return res
      .status(400)
      .json({ error: "Se requiere el ID del Doctor y la fecha" });
  }
  // Comprobar que la fecha de la entrada se válida de acuerdo a la
  // especificación ISO 8601 (1970-01-01T00:00:00.000+00:00)
  // if (
  //   !fecha.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}\+\d{2}:\d{2}$/)
  // ) {
  //   return res.status(400).json({ error: "La fecha no es válida" });
  // }

  console.log("Fecha Inicial:", fechaInicial);
  console.log("Fecha Final:", fechaFinal);

  // Comprobar que el doctorId esté en la base de datos.
  try {
    doctor = await UsuarioModel.findOne({
      _id: doctor_id,
      rol: "doctor",
    });
    if (!doctor) {
      return res
        .status(404)
        .json({ error: "El Id proporcionado no pertenece a un doctor" });
    }
  } catch (error) {
    console.error("Error al validar doctor:", error);
    // const errors = controlDeErrores(error);
    res.status(500).json({ error: "Error al comprobar el doctor" });
  }
  // Fechas Disponibles por Doctor
  // Hacer la consulta a la base de datos solicitando que haga una lista de las
  // fechas agendadas estas deben encontrarse en el rango de fecha y días
  // laborales y que sus estados deben ser: ["confirmada", "pendiente"]
  try {
    citas = await CitaModel.find({
      doctor_id: doctor_id,
      fecha: {
        $gte: fechaInicial,
        $lte: fechaFinal,
      },
      estado: { $in: ["confirmada", "pendiente"] },
    });
    if (!citas) {
      return res.status(404).json({
        error:
          "No hay citas disponibles para el" +
          " doctor en el rango de fechas solicitados",
      });
    }

    fechasDisponibles = fechasDisponiblesDoctor(fecha, citas);

    // Retornar el objeto con las fechas disponibles
    res.status(200).json(fechasDisponibles);

  } catch (error) {
    console.error("Error al buscar la cita:", error);
    // const errors = controlDeErrores(error);
    res.status(500).json({ error: "Error al buscar la cita" });
  }
};

/**
 * Función para obtener las fechas disponibles para un médico en un rango de fechas, excluyendo las citas existentes.
 * @function
 * @param {string} fecha - Fecha de inicio del rango en formato ISO.
 * @param {Array} citas - Array de objetos de citas existentes.
 * @returns {Array} - Array de fechas disponibles en formato ISO.
 */
function fechasDisponiblesDoctor(fecha, citas) {
  let fechaInicial = new Date(fecha);
  console.log("Fecha de la Inicial: " + fechaInicial);

  // Partiendo de la fechaInicial, generar un arreglo de fechas con horas laborales
  // (de 8:00 a 19:00, lunes a sábado)
  const values = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(fechaInicial.getTime() + i * 24 * 60 * 60 * 1000);
    for (let hour = 8; hour < 20; hour++) {
      values.push(
          new Date(Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth(),
              date.getUTCDate(),
              hour,
              0,
              0,
              0,
          ))
      );
    }
  }

  console.log("Citas:", citas);
  console.log(typeof (citas));

  // Eliminar las fechas que coinciden con las citas
  citas.forEach((cita) => {
    const citaDate = new Date(cita.fecha);
    console.log("Fecha de la citaDate: " + citaDate);
    values.splice(values.findIndex((value) =>
        value.getUTCFullYear() === citaDate.getUTCFullYear() &&
        value.getUTCMonth() === citaDate.getUTCMonth() &&
        value.getUTCDate() === citaDate.getUTCDate() &&
        value.getUTCHours() === citaDate.getUTCHours()&&
        value.getUTCMinutes() === citaDate.getUTCMinutes()&&
        value.getUTCSeconds() === citaDate.getUTCSeconds() &&
        value.getUTCMilliseconds() === citaDate.getUTCMilliseconds()
    ), 1);
  });

  return values;
}


// POST: Enviar recordatorio de cita
// router.post("/citas/:id/notificacion", citaController.notificarCita);

// Función auxiliar para el control de errores
// function controlDeErrores(error) {
// }

module.exports = controller;