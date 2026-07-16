/*
  NOTIFICACIONES POR CORREO — HM Express
  ----------------------------------------
  Usa la misma cuenta de EmailJS que ya tienes de MontPellier (o crea una en
  https://www.emailjs.com — plan gratuito).

  1. En EmailJS crea un "Email Service" y copia su ID en EMAILJS_SERVICE_ID.
  2. Crea un "Email Template" con estas variables (usarlas tal cual entre {{ }}):
       {{trabajador}}  {{cliente}}  {{tipo_servicio}}  {{evento}}  {{hora}}  {{to_email}}
     Ejemplo de cuerpo del correo:
       "{{trabajador}} {{evento}} el servicio de {{cliente}} ({{tipo_servicio}}) a las {{hora}}."
  3. Copia el Template ID en EMAILJS_TEMPLATE_ID.
  4. En Account > General copia tu Public Key en EMAILJS_PUBLIC_KEY.
  5. Cambia CORREO_PROPIETARIO por tu correo real.
*/

const EMAILJS_SERVICE_ID = "TU_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "TU_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY = "TU_PUBLIC_KEY";
const CORREO_PROPIETARIO = "tu-correo@ejemplo.com";

if (window.emailjs) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

function notificarPropietario(servicio, evento) {
  // evento: "inicio" | "fin"
  if (!window.emailjs) return;

  const params = {
    to_email: CORREO_PROPIETARIO,
    trabajador: servicio.trabajadorNombre,
    cliente: servicio.clienteNombre,
    tipo_servicio: servicio.tipoServicio,
    evento: evento === "inicio" ? "inició" : "terminó",
    hora: new Date().toLocaleString("es-CO"),
  };

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params).catch((err) => {
    console.error("Error enviando notificación por correo:", err);
  });
}
