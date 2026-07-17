/*
  NOTIFICACIONES POR CORREO — HM Express
  ----------------------------------------
  Usa la misma cuenta de EmailJS que ya tienes de MontPellier (o crea una en
  https://www.emailjs.com — plan gratuito).

  1. En EmailJS crea un "Email Service" y copia su ID en EMAILJS_SERVICE_ID.
  2. Crea un "Email Template". Te dejé un boceto completo y ya diseñado en
     el archivo email-template.html — solo pégalo en el editor de EmailJS.
     Variables disponibles: {{trabajador}} {{cliente}} {{tipo_servicio}}
     {{direccion}} {{valor}} {{evento}} {{evento_titulo}} {{hora}} {{to_email}}
  3. Copia el Template ID en EMAILJS_TEMPLATE_ID.
  4. En Account > General copia tu Public Key en EMAILJS_PUBLIC_KEY.
  5. Cambia CORREO_PROPIETARIO por tu correo real.
*/

const EMAILJS_SERVICE_ID = "service_f97vf7e";
const EMAILJS_TEMPLATE_ID = "template_cuz8g39";
const EMAILJS_PUBLIC_KEY = "092KHcfz35-QNZgR0";
const CORREO_PROPIETARIO = "corresoeluis@gmail.com";

if (window.emailjs) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

function notificarPropietario(servicio, evento) {
  // evento: "inicio" | "fin"
  if (!window.emailjs) return;

  const esDomicilioConDosDirecciones = servicio.tipoServicio === "Domicilios" && servicio.direccionRecogida && servicio.direccionEntrega;
  const direccionTexto = esDomicilioConDosDirecciones
    ? `Recogida: ${servicio.direccionRecogida} · Entrega: ${servicio.direccionEntrega}`
    : servicio.direccion || "";

  const params = {
    to_email: CORREO_PROPIETARIO,
    trabajador: servicio.trabajadorNombre,
    cliente: servicio.clienteNombre,
    tipo_servicio: servicio.tipoServicio,
    direccion: direccionTexto,
    valor: fmtMoney(servicio.valor),
    evento: evento === "inicio" ? "inició" : "terminó",
    evento_titulo: evento === "inicio" ? "Servicio iniciado" : "Servicio terminado",
    hora: new Date().toLocaleString("es-CO"),
  };

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params).catch((err) => {
    console.error("Error enviando notificación por correo:", err);
  });
}
