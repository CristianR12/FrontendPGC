// src/legal/contenido.ts
// Texto de los Términos y Condiciones y de la Política de Tratamiento de Datos Personales.
//
// BORRADOR para revisión de la oficina jurídica de la Universidad. Lo que falta por definir está marcado como
// [[PENDIENTE: ...]] y se resalta en pantalla para que no pase inadvertido.
// Al cambiar el contenido, sube VERSION_LEGAL (y VERSION en BackendPGC/api_app/legal.py): todos deberán aceptar de nuevo.

export const VERSION_LEGAL = '2026-10-04';

export interface SeccionLegal {
  titulo: string;
  parrafos?: string[];
  lista?: string[];
}

export interface DocumentoLegal {
  id: 'terminos' | 'privacidad';
  titulo: string;
  resumen: string;
  secciones: SeccionLegal[];
}

const NOMBRE = 'Sistema de control de ingreso y registro de asistencia basado en Inteligencia Artificial';
const UNIVERSIDAD = 'Universidad de Cundinamarca, Seccional Ubaté';

export const TERMINOS: DocumentoLegal = {
  id: 'terminos',
  titulo: 'Términos y condiciones de uso',
  resumen: `Reglas para usar el ${NOMBRE} (en adelante, "el Sistema").`,
  secciones: [
    {
      titulo: '1. Aceptación',
      parrafos: [
        'Al iniciar sesión y marcar la casilla de aceptación declaras que leíste estos términos y que los aceptas. Si no estás de acuerdo, no uses el Sistema y consulta a la Universidad cómo se registrará tu asistencia por otro medio.',
        `El Sistema se desarrolla como trabajo de grado del programa de Ingeniería de Sistemas de la ${UNIVERSIDAD}.`,
      ],
    },
    {
      titulo: '2. ¿Qué es el Sistema?',
      parrafos: [
        'Es una herramienta académica para registrar y consultar la asistencia a clase, gestionar horarios y cursos, y apoyar el seguimiento de la asistencia. Incluye un portal para docentes, una vista de consulta para estudiantes y un módulo de reconocimiento facial que funciona de forma independiente y comparte datos con el portal.',
      ],
    },
    {
      titulo: '3. Quién puede usarlo y cuentas',
      lista: [
        'Docentes, estudiantes y administradores de la comunidad universitaria, con una cuenta institucional verificada.',
        'La cuenta es personal e intransferible. No compartas tu sesión ni tus credenciales.',
        'Los estudiantes solo pueden vincular su propia cédula, y la vinculación queda registrada.',
        'La Universidad puede suspender el acceso ante un uso indebido.',
      ],
    },
    {
      titulo: '4. Uso aceptable',
      parrafos: ['Está prohibido:'],
      lista: [
        'Acceder, consultar o modificar información que no te corresponda.',
        'Alterar registros de asistencia sin ser el docente del curso, o suplantar a otra persona.',
        'Intentar vulnerar la seguridad del Sistema, automatizar su uso abusivo o interferir con su funcionamiento.',
        'Usar la información obtenida para fines distintos de los académicos, o divulgarla a terceros.',
      ],
    },
    {
      titulo: '5. Obligaciones de los docentes',
      lista: [
        'Usar los datos de sus estudiantes únicamente para fines académicos y mantenerlos en reserva.',
        'Corregir registros de asistencia solo cuando corresponda y de buena fe: los cambios quedan registrados.',
        'No compartir reportes, listados ni capturas con personas no autorizadas.',
      ],
    },
    {
      titulo: '6. Obligaciones de los estudiantes',
      lista: [
        'Mantener veraces y actualizados sus datos de contacto y los equipos que registra.',
        'Avisar a su docente o al administrador si encuentra un error en su asistencia o en sus datos.',
      ],
    },
    {
      titulo: '7. Registro de actividad',
      parrafos: [
        'Por seguridad y trazabilidad, el Sistema guarda quién hizo ciertos cambios y cuándo (por ejemplo, modificaciones de asistencias, de horarios y de los datos que un estudiante edita, con el valor anterior y el nuevo).',
      ],
    },
    {
      titulo: '8. Datos personales',
      parrafos: [
        'El tratamiento de tus datos se rige por la Política de tratamiento de datos personales, que forma parte de estos términos y debes leer.',
      ],
    },
    {
      titulo: '9. Disponibilidad y límites',
      lista: [
        'El Sistema es un proyecto académico: se ofrece sin garantía de disponibilidad continua y puede tener interrupciones o cambios.',
        'El reconocimiento facial puede equivocarse. Por eso la asistencia siempre puede corregirse manualmente por el docente.',
        'La validez oficial de la asistencia la determina la Universidad según su reglamento.',
      ],
    },
    {
      titulo: '10. Propiedad intelectual',
      parrafos: [
        'El software, su diseño y su documentación pertenecen a sus autores, sujetos a lo que disponga el reglamento de propiedad intelectual de la Universidad para los trabajos de grado. [[PENDIENTE: confirmar con la Universidad la titularidad y la licencia del software]]',
        'La información que cada persona ingresa sigue siendo suya y de la Universidad según corresponda.',
      ],
    },
    {
      titulo: '11. Responsabilidad',
      parrafos: [
        'Cada persona responde por el uso que haga de su cuenta. Los autores y la Universidad no responden por daños derivados del uso indebido de las credenciales ni por interrupciones ajenas a su control, en los límites que permita la ley.',
      ],
    },
    {
      titulo: '12. Cambios',
      parrafos: [
        'Estos términos pueden actualizarse. Cuando cambien, se te pedirá aceptarlos de nuevo antes de seguir usando el Sistema. La versión vigente aparece al final de este documento.',
      ],
    },
    {
      titulo: '13. Ley aplicable y contacto',
      parrafos: [
        'Se rigen por las leyes de la República de Colombia. Para consultas sobre estos términos: [[PENDIENTE: canal de contacto oficial de la Universidad]].',
      ],
    },
  ],
};

export const PRIVACIDAD: DocumentoLegal = {
  id: 'privacidad',
  titulo: 'Política de tratamiento de datos personales',
  resumen: 'Qué datos se recogen, para qué, cómo se protegen y cómo ejercer tus derechos (Ley 1581 de 2012 y Decreto 1377 de 2013).',
  secciones: [
    {
      titulo: '1. Responsable y encargado del tratamiento',
      parrafos: [
        `Responsable: ${UNIVERSIDAD}. [[PENDIENTE: NIT, dirección y datos de contacto del responsable]]`,
        'Desarrollo y operación técnica del Sistema: Sharon Ariadna Rincón Guerrero y Cristian Alejandro Rodríguez Rodríguez, estudiantes de Ingeniería de Sistemas, bajo la dirección del docente Rafael Ortega Ortega.',
        'Solicitudes sobre datos personales: [[PENDIENTE: correo o canal oficial para peticiones, consultas y reclamos]].',
      ],
    },
    {
      titulo: '2. Marco normativo',
      lista: [
        'Constitución Política de Colombia, artículos 15 y 20.',
        'Ley Estatutaria 1581 de 2012 (protección de datos personales).',
        'Decreto 1377 de 2013, compilado en el Decreto 1074 de 2015.',
        'Lineamientos de la Superintendencia de Industria y Comercio (SIC).',
      ],
    },
    {
      titulo: '3. Datos que se tratan',
      lista: [
        'Identificación: nombre completo, tipo y número de documento.',
        'Cuenta: correo institucional y el identificador de tu cuenta de acceso.',
        'Académicos: cursos, grupos, horarios y registros de asistencia (estado, fecha, hora y si llegaste tarde).',
        'Contacto (estudiantes): teléfono, correo personal y contacto de emergencia.',
        'Equipos (docentes y estudiantes): marca y serial de los portátiles con que ingresas.',
        'Docentes: programa académico y facultad.',
        'Registro de actividad: quién cambió qué y cuándo.',
        'Datos biométricos (sensibles), solo si los autorizas: imagen y características del rostro y, de forma complementaria, de la voz, para verificar identidad y registrar asistencia.',
      ],
    },
    {
      titulo: '4. Finalidades',
      lista: [
        'Registrar y consultar la asistencia a clase y generar reportes académicos.',
        'Gestionar horarios, cursos e inscripciones.',
        'Verificar la identidad al ingresar a clase (solo con tu autorización biométrica).',
        'Control del ingreso de equipos a la Universidad.',
        'Producir estadísticas y avisos de asistencia dirigidos a docentes y estudiantes.',
        'Garantizar la seguridad y la trazabilidad del Sistema.',
      ],
      parrafos: ['Tus datos no se usan para finalidades distintas de las anteriores sin pedirte una nueva autorización.'],
    },
    {
      titulo: '5. Datos sensibles (biometría): autorización facultativa',
      parrafos: [
        'Los datos biométricos son sensibles. Su autorización es voluntaria: no estás obligado a darla y no recibirás ningún trato desfavorable por negarla. Si no la das, tu asistencia se registra manualmente por tu docente.',
        'Puedes otorgarla o revocarla en cualquier momento desde "Mis datos y privacidad", en el pie de página. Revocarla no afecta lo ya tratado antes de la revocatoria.',
        '[[PENDIENTE: definir con el módulo de reconocimiento facial dónde se guardan las plantillas biométricas y cuándo se eliminan]]',
      ],
    },
    {
      titulo: '6. Tus derechos',
      lista: [
        'Conocer, actualizar y rectificar tus datos.',
        'Solicitar prueba de la autorización otorgada.',
        'Ser informado sobre el uso que se da a tus datos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio.',
        'Revocar la autorización y solicitar la supresión de tus datos cuando no se respeten los principios y garantías legales o no exista un deber de conservarlos.',
        'Acceder gratuitamente a tus datos.',
      ],
      parrafos: [
        'Puedes ejercerlos desde "Mis datos y privacidad". Las consultas se responden en máximo 10 días hábiles (prorrogables 5 más) y los reclamos en máximo 15 días hábiles (prorrogables 8 más), según la Ley 1581 de 2012.',
      ],
    },
    {
      titulo: '7. Quién accede a tus datos',
      lista: [
        'Tú, sobre tus propios datos.',
        'Los docentes, solo sobre los estudiantes de sus cursos.',
        'Los administradores del Sistema, para gestionar cuentas, solicitudes y la trazabilidad.',
        'Proveedores tecnológicos que alojan el Sistema, en calidad de encargados.',
      ],
      parrafos: ['Los datos no se venden ni se ceden a terceros ajenos a la finalidad descrita.'],
    },
    {
      titulo: '8. Transmisión internacional',
      parrafos: [
        'El Sistema usa servicios de nube (Google Firebase, Render y Netlify) cuyos servidores pueden estar fuera de Colombia, por lo que tus datos pueden ser transmitidos al exterior para su almacenamiento y procesamiento técnico. [[PENDIENTE: confirmar con la oficina jurídica el cumplimiento del régimen de transmisión internacional (Ley 1581, art. 26 y Decreto 1377)]]',
      ],
    },
    {
      titulo: '9. Seguridad',
      parrafos: [
        'Se aplican medidas razonables: acceso con cuenta institucional verificada, permisos según el rol, validación de cada solicitud en el servidor, comunicación cifrada y registro de los cambios. Ningún sistema es infalible; si detectas un uso indebido, avísanos de inmediato.',
      ],
    },
    {
      titulo: '10. Conservación',
      parrafos: [
        'Tus datos se conservan mientras dure tu vínculo académico con la Universidad y durante el tiempo que establezca su tabla de retención documental. [[PENDIENTE: plazo exacto según la tabla de retención documental]] Después se suprimen o se anonimizan.',
      ],
    },
    {
      titulo: '11. Autorización',
      parrafos: [
        'Al marcar la casilla correspondiente autorizas, de forma previa, expresa e informada, el tratamiento de tus datos personales conforme a esta política. La casilla de datos biométricos es independiente y opcional.',
        'Se guarda constancia de tu aceptación (versión, fecha y hora) como prueba de la autorización.',
      ],
    },
    {
      titulo: '12. Vigencia y cambios',
      parrafos: [
        'Esta política puede actualizarse; si cambia de forma sustancial se te pedirá una nueva autorización. [[PENDIENTE: alinear este texto con la Política de tratamiento de datos de la Universidad]]',
      ],
    },
  ],
};

export const DOCUMENTOS: Record<DocumentoLegal['id'], DocumentoLegal> = { terminos: TERMINOS, privacidad: PRIVACIDAD };
