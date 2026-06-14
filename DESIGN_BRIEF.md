# Brief de diseño — Escuelitas Fut ⚽

> Documento para pasar a una herramienta de diseño. Describe el producto y todas
> las pantallas y componentes que existen hasta hoy (Fase 0), para diseñarlos.

## 1. Qué es el producto

**Escuelitas Fut** es una plataforma web (SaaS) para administrar escuelas de
futbol infantil/juvenil. Es **multi-escuela**: muchas escuelas distintas la usan,
cada una con sus propios alumnos, equipos y pagos.

Tiene **dos portales** con públicos muy distintos:

- **Portal de administración** — para el dueño/admin de la escuela. Es una
  herramienta de trabajo: dar de alta alumnos, equipos, registrar pagos,
  capturar resultados de partidos. Se usa más en computadora.
- **Portal de padres** — para los papás/mamás. Ven a sus hijos, pagan
  mensualidades y siguen los partidos y torneos. Se usa **sobre todo en el
  celular**, y recibirán notificaciones.

## 2. Usuarios y tono

- **Admins**: dueños de escuelas de futbol, no necesariamente técnicos.
  Necesitan claridad y rapidez. Pantallas con datos, tablas, formularios.
- **Padres**: público general. Necesitan simpleza, calidez y que se vea bonito
  en el celular. Es la cara emocional del producto (ver a su hijo jugar).
- **Tono**: deportivo, confiable, amigable. Profesional pero no corporativo frío.
  Pensar en futbol, energía, comunidad.
- **Idioma**: todo en **español (México)**.

## 3. Plataforma y restricciones

- Es **web responsiva / PWA** (instalable en el celular). **Mobile-first** para
  el portal de padres; el portal de admin puede priorizar escritorio pero debe
  funcionar en móvil.
- Construida con **Tailwind CSS**, así que el diseño debe poder expresarse con
  tokens: paleta de color, tipografía, radios, sombras, espaciados.
- Necesitamos definir un **sistema de diseño / tokens**: colores primario y
  acentos, grises, tipografía (títulos y cuerpo), estados (éxito, error, aviso).

## 4. Dirección visual actual (punto de partida, libre de cambiar)

Hoy es un diseño base muy simple: acento **verde esmeralda**, grises neutros y
fondo blanco. Es solo un placeholder funcional — **hay libertad total** para
proponer una identidad mejor (incluso espacio para logo de la escuela, ya que
cada escuela podrá subir el suyo). Sugerencia: una marca deportiva con un color
primario fuerte, buen contraste y un toque de energía.

## 5. Pantallas a diseñar (lo que existe hoy)

### 5.1 Landing pública (`/`)

Página de entrada para quien no ha iniciado sesión.

- Badge/etiqueta: "⚽ Escuelitas Fut"
- Título: **"Administra tu escuela de futbol en un solo lugar"**
- Subtítulo: "Control de alumnos, pagos en línea, partidos y torneos. Los papás
  reciben notificaciones de cómo van sus hijos."
- Dos botones: **"Empezar gratis"** (primario) e **"Iniciar sesión"** (secundario).
- Oportunidad: agregar secciones de features, capturas, testimonios, etc.

### 5.2 Iniciar sesión (`/login`)

- Título: "Iniciar sesión" + subtítulo "Entra para administrar tu escuela o ver
  a tus hijos."
- Campos: **Correo**, **Contraseña**.
- Botón primario: "Entrar". Estado de carga: "Un momento…".
- Mensaje de error (ej. "Correo o contraseña incorrectos").
- Enlace inferior: "¿No tienes cuenta? Crear una".

### 5.3 Crear cuenta (`/registro`)

- Título: "Crear cuenta" + subtítulo "Regístrate para empezar a usar la plataforma."
- Campos: **Nombre completo**, **Correo**, **Contraseña** (con pista "Mínimo 8
  caracteres").
- Botón primario: "Crear cuenta".
- Enlace inferior: "¿Ya tienes cuenta? Inicia sesión".

### 5.4 Onboarding — crear escuela (`/onboarding`)

Primer paso tras registrarse.

- Título: "Crea tu escuela" + subtítulo "Dale un nombre a tu escuela de futbol.
  Podrás cambiarlo después."
- Campo: **Nombre de la escuela** (placeholder "Ej. Águilas FC").
- Botón primario: "Crear escuela".

### 5.5 Portal de administración (`/admin`)

Layout con **menú lateral** + **barra superior** (ver componente 6.1).

- Menú lateral: Inicio, Alumnos, Equipos, Pagos, Partidos.
- Dashboard de inicio:
  - Título: "Bienvenido a {nombre de la escuela}" + subtítulo "Este es el panel
    de administración. Desde aquí gestionarás todo tu club."
  - **4 tarjetas de métrica** en fila: Alumnos, Equipos, Pagos del mes,
    Próximos partidos (cada una: etiqueta, número grande, texto pequeño de pie).
  - Una **tarjeta destacada** "Siguiente paso" con texto guía.

### 5.6 Portal de padres (`/padres`)

Mismo tipo de layout (menú lateral + barra superior), pensado **mobile-first**.

- Menú lateral: Inicio, Mis hijos, Pagos, Partidos.
- Dashboard de inicio:
  - Saludo: "Hola, {nombre} 👋" + subtítulo "Aquí verás a tus hijos, sus pagos y
    cómo van sus partidos."
  - Tarjeta de **estado vacío**: "Aún no hay nada que mostrar".

## 6. Componentes reutilizables a diseñar

1. **Cáscara de portal (PortalShell)**: menú lateral con nombre de la escuela +
   etiqueta del portal ("Administración" / "Portal de padres") y lista de
   navegación; barra superior con nombre del usuario y botón "Cerrar sesión".
   Debe colapsar bien en móvil (menú hamburguesa o navegación inferior).
2. **Botón primario** (con estado normal, hover, cargando, deshabilitado).
3. **Botón secundario** (borde).
4. **Campo de formulario** (etiqueta, input, pista opcional, estado de error).
5. **Tarjeta de métrica (StatCard)**: etiqueta, valor grande, nota al pie.
6. **Tarjeta de estado vacío / aviso** (borde punteado, texto guía).
7. **Mensajes de error y éxito** en formularios.

## 7. Estados a contemplar

- **Cargando** (botones y futuras tablas).
- **Vacío** (sin alumnos, sin pagos, sin partidos) — muy importante porque al
  inicio todo está vacío.
- **Error** (formularios, fallos de red).

## 8. Hacia dónde va (para diseñar pensando a futuro)

Aunque hoy solo existe lo de arriba, el producto crecerá con: lista y ficha de
**alumnos** (con foto), **equipos/categorías**, **pagos** (mensualidades,
adeudos, recibos), **partidos** (calendario, resultado, marcador) y **torneos**
(tabla de posiciones), además de **notificaciones**. Diseñar el sistema de modo
que estas secciones (tablas, listas, fichas, calendarios) encajen después.
