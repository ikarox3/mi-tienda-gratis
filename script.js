// Configura aquí el puente con tu base de datos
const API_URL = "https://script.google.com/macros/s/AKfycbz6fcys6wf6ZpjZCaI07NGELx8NMcbgUzL5Y4lq2PCY2thW9gDnXWB8EgH0ORptkP10pw/exec"; 

let productosInventario = [];
let carrito = [];

// 1. EJECUTAR AL CARGAR LA PÁGINA
document.addEventListener("DOMContentLoaded", () => {
  cargarProductosDesdeSheets();
});

// 2. LEER PRODUCTOS DE GOOGLE SHEETS
async function cargarProductosDesdeSheets() {
  try {
    const respuesta = await fetch(`${API_URL}?accion=obtenerProductos`);
    const resultado = await respuesta.json();
    
    if (resultado.exito) {
      productosInventario = resultado.datos;
      dibujarCatalogo(productosInventario);
    } else {
      alert("Error al cargar productos: " + resultado.mensaje);
    }
  } catch (error) {
    console.error(error);
    document.getElementById("contenedor-productos").innerHTML = 
      "<p class='text-red-500'>Error de conexión con el servidor.</p>";
  }
}

// 3. DIBUJAR LAS TARJETAS EN EL HTML
function dibujarCatalogo(productos) {
  const contenedor = document.getElementById("contenedor-productos");
  contenedor.innerHTML = ""; // Limpiar texto de carga

  if (productos.length === 0) {
    contenedor.innerHTML = "<p class='text-gray-500'>No hay productos disponibles.</p>";
    return;
  }

  productos.forEach(prod => {
    // Si tus columnas en Sheets se llaman diferente (ej. "Nombre_Prod"), cámbialas aquí
    const tarjeta = `
      <div class="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between">
        <img src="${prod.Imagen || 'https://placeholder.com'}" alt="${prod.Nombre}" class="w-full h-40 object-cover rounded-lg mb-3">
        <div>
          <h3 class="font-bold text-lg">${prod.Nombre}</h3>
          <p class="text-gray-500 text-sm mb-2 line-clamp-2">${prod.Descripcion || ''}</p>
          <p class="text-blue-600 font-bold text-xl mb-4">$${parseFloat(prod.Precio).toFixed(2)}</p>
        </div>
        <button onclick="agregarAlCarrito('${prod.ID}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition">
          Agregar al Carrito
        </button>
      </div>
    `;
    contenedor.innerHTML += tarjeta;
  });
}

// 4. LÓGICA INTERNA DEL CARRITO
function agregarAlCarrito(idProducto) {
  const producto = productosInventario.find(p => p.ID == idProducto);
  if (!producto) return;

  const itemEnCarrito = carrito.find(item => item.idProducto == idProducto);

  if (itemEnCarrito) {
    itemEnCarrito.cantidad++;
    itemEnCarrito.subtotal = itemEnCarrito.cantidad * itemEnCarrito.precio;
  } else {
    carrito.push({
      idProducto: producto.ID,
      nombre: producto.Nombre,
      precio: parseFloat(producto.Precio),
      cantidad: 1,
      subtotal: parseFloat(producto.Precio)
    });
  }
  actualizarInterfazCarrito();
}

function actualizarInterfazCarrito() {
  const contenedorItems = document.getElementById("items-carrito");
  const contador = document.getElementById("contador-carrito");
  const totalTxt = document.getElementById("total-carrito");

  contenedorItems.innerHTML = "";
  
  if (carrito.length === 0) {
    contenedorItems.innerHTML = "<p class='text-gray-400 text-sm'>El carrito está vacío.</p>";
    contador.innerText = "0";
    totalTxt.innerText = "0.00";
    return;
  }

  let totalAcumulado = 0;
  let totalItems = 0;

  carrito.forEach(item => {
    totalAcumulado += item.subtotal;
    totalItems += item.cantidad;

    const fila = `
      <div class="flex justify-between items-center text-sm border-b pb-2">
        <div>
          <p class="font-semibold">${item.nombre}</p>
          <p class="text-gray-500">Cant: ${item.cantidad} x $${item.precio}</p>
        </div>
        <span class="font-bold">$${item.subtotal.toFixed(2)}</span>
      </div>
    `;
    contenedorItems.innerHTML += fila;
  });

  contador.innerText = totalItems;
  totalTxt.innerText = totalAcumulado.toFixed(2);
}

// 5. ENVIAR EL PEDIDO AL APPS SCRIPT (MÉTODO POST)
async function enviarPedido() {
  if (carrito.length === 0) {
    alert("Agrega productos antes de confirmar.");
    return;
  }

  const datosPedido = {
    accion: "crearPedido",
    //idUsuario: "COMPRADOR-ANONIMO", // Cambiar por el ID real cuando tengas login
    idUsuario: usuarioActivo ? usuarioActivo.id : "ANONIMO",
    total: parseFloat(document.getElementById("total-carrito").innerText),
    productos: carrito
  };

  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(datosPedido)
    });
    
    const resultado = await respuesta.json();
    
    if (resultado.exito) {
      alert(`¡Pedido creado con éxito! Código: ${resultado.idPedido}`);
      carrito = []; // Limpiar carrito local
      actualizarInterfazCarrito();
    } else {
      alert("Error al procesar pedido: " + resultado.error);
    }
  } catch (error) {
    console.error(error);
    alert("Hubo un fallo en la conexión al enviar el pedido.");
  }
}

// Variable global para guardar los datos del usuario activo
let usuarioActivo = null;

// Ejecutar automáticamente al cargar la página para ver si ya había iniciado sesión antes
document.addEventListener("DOMContentLoaded", () => {
  comprobarSesionGuardada();
});

function abrirCerrarModalLogin() {
  const modal = document.getElementById("modal-login");
  modal.classList.toggle("hidden");
}

function comprobarSesionGuardada() {
  const sesion = localStorage.getItem("sesion_tienda");
  if (sesion) {
    usuarioActivo = JSON.parse(sesion);
    actualizarInterfazUsuario();
  }
}

// ENVIAR CREDENCIALES AL backend (APPS SCRIPT)
async function ejecutarLogin(event) {
  event.preventDefault(); // Evita que la página se recargue
  
  const correo = document.getElementById("login-correo").value;
  const contrasena = document.getElementById("login-pass").value;

  const datosLogin = {
    accion: "login",
    correo: correo,
    contrasena: contrasena
  };

  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(datosLogin)
    });
    const resultado = await respuesta.json();

    if (resultado.exito) {
      usuarioActivo = resultado.usuario;
      // Guardar en el navegador para que no deba loguearse cada vez que refresque
      localStorage.setItem("sesion_tienda", JSON.stringify(usuarioActivo)); 
      
      actualizarInterfazUsuario();
      abrirCerrarModalLogin();
      alert(`¡Bienvenido de vuelta, ${usuarioActivo.nombre}!`);
    } else {
      alert("Error: " + resultado.mensaje);
    }
  } catch (error) {
    console.error(error);
    alert("Error de conexión al intentar iniciar sesión.");
  }
}

function actualizarInterfazUsuario() {
  const texto = document.getElementById("texto-usuario");
  const boton = document.getElementById("btn-login-logout");
  const panelAdmin = document.getElementById("panel-admin");
  
  // Elementos del chat a controlar
  const inputChat = document.getElementById("input-mensaje-chat");
  const btnChat = document.getElementById("btn-enviar-chat");

  if (usuarioActivo) {
    // 1. Modificar barra superior
    texto.innerText = `👤 Conectado como: ${usuarioActivo.nombre} (${usuarioActivo.rol})`;
    boton.innerText = "Cerrar Sesión";
    boton.setAttribute("onclick", "cerrarSesion()");
    boton.className = "bg-red-600 hover:bg-red-700 px-3 py-1 rounded";

    // 2. Desbloquear elementos del chat de forma explícita
    if (inputChat && btnChat) {
      inputChat.disabled = false;
      inputChat.placeholder = "Escribe un mensaje...";
      btnChat.disabled = false;
    }

    // 3. Controlar visibilidad del Panel de Administración
    if (usuarioActivo.rol === "Admin") {
      if (panelAdmin) panelAdmin.classList.remove("hidden");
      cargarReportesVentas(); 
    } else {
      if (panelAdmin) panelAdmin.classList.add("hidden");
    }

    // Activar la carga inicial de mensajes si la ventana ya está abierta
    const ventanaChat = document.getElementById("ventana-chat");
    if (ventanaChat && !ventanaChat.classList.contains("hidden")) {
      cargarMensajesChat();
      if (!intervaloChat) {
        intervaloChat = setInterval(cargarMensajesChat, 8000);
      }
    }

  } else {
    // Lógica cuando NO hay nadie conectado (Invitado)
    texto.innerText = "👋 Invitado (No has iniciado sesión)";
    boton.innerText = "Iniciar Sesión";
    boton.setAttribute("onclick", "abrirCerrarModalLogin()");
    boton.className = "bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded";
    
    if (panelAdmin) panelAdmin.classList.add("hidden");

    // Bloquear el chat por completo
    if (inputChat && btnChat) {
      inputChat.disabled = true;
      inputChat.placeholder = "Debes iniciar sesión...";
      btnChat.disabled = true;
    }
    
    // Limpiar el bucle de consulta del chat
    clearInterval(intervaloChat);
    intervaloChat = null;
    
    const cajaMsg = document.getElementById("caja-mensajes");
    if (cajaMsg) {
      cajaMsg.innerHTML = "<p class='text-gray-400 text-center italic'>Inicia sesión para chatear con la vendedora.</p>";
    }
  }
}


// FUNCIÓN PARA CARGAR LOS PEDIDOS DE LA HOJA
async function cargarReportesVentas() {
  try {
    // Reutilizaremos un truco: agregamos una nueva acción en la URL para leer pedidos
    const respuesta = await fetch(`${API_URL}?accion=obtenerPedidos`);
    const resultado = await respuesta.json();
    
    if (resultado.exito) {
      const tabla = document.getElementById("tabla-reportes-admin");
      tabla.innerHTML = "";
      
      resultado.datos.forEach(ped => {
        const fila = `
          <tr class="hover:bg-gray-50 border-b">
            <td class="p-2 font-mono">${ped.ID_Pedido || ped.ID}</td>
            <td class="p-2">${ped.ID_Usuario || 'Anónimo'}</td>
            <td class="p-2 font-bold text-green-600">$${parseFloat(ped.Total).toFixed(2)}</td>
            <td class="p-2"><span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-bold">${ped.Estado}</span></td>
          </tr>
        `;
        tabla.innerHTML += fila;
      });
    }
  } catch (error) {
    console.error("Error cargando reportes:", error);
  }
}

// ENVIAR ACTUALIZACIÓN DE STOCK AL BACKEND
async function actualizarStockAdmin() {
  const idProd = document.getElementById("admin-prod-id").value;
  const nuevoStock = document.getElementById("admin-prod-stock").value;

  if (!idProd || !nuevoStock) {
    alert("Por favor rellena ambos campos.");
    return;
  }

  const datosActualizar = {
    accion: "actualizarStock",
    idProducto: idProd,
    stock: parseInt(nuevoStock)
  };

  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(datosActualizar)
    });
    const resultado = await respuesta.json();

    if (resultado.exito) {
      alert("¡Stock actualizado con éxito en Google Sheets!");
      document.getElementById("admin-prod-id").value = "";
      document.getElementById("admin-prod-stock").value = "";
      cargarProductosDesdeSheets(); // Recargar el catálogo visual
    } else {
      alert("Error: " + resultado.mensaje);
    }
  } catch (error) {
    alert("Error de conexión al actualizar.");
  }
}


function cerrarSesion() {
  localStorage.removeItem("sesion_tienda");
  usuarioActivo = null;
  actualizarInterfazUsuario();
  alert("Sesión cerrada.");
}

// Modificación de tu función enviarPedido() previa:
// Busca en tu script.js la línea donde dice: idUsuario: "COMPRADOR-ANONIMO"
// Y REEMPLÁZALA por esta lógica:
// idUsuario: usuarioActivo ? usuarioActivo.id : "ANONIMO",


let intervaloChat = null;

function toggleVentanaChat() {
  const ventana = document.getElementById("ventana-chat");
  ventana.classList.toggle("hidden");
  
  // Si abren el chat y hay usuario, activamos la actualización constante
  if (!ventana.classList.contains("hidden") && usuarioActivo) {
    cargarMensajesChat();
    // Consultar nuevos mensajes automáticamente cada 8 segundos
    if (!intervaloChat) {
      intervaloChat = setInterval(cargarMensajesChat, 8000);
    }
  }
}

// Habilitar o deshabilitar la escritura del chat según el login
// AGREGA ESTAS LÍNEAS al final de tu función existente "actualizarInterfazUsuario()"
/* if (usuarioActivo) {
  document.getElementById("input-mensaje-chat").disabled = false;
  document.getElementById("input-mensaje-chat").placeholder = "Escribe un mensaje...";
  document.getElementById("btn-enviar-chat").disabled = false;
} else {
  document.getElementById("input-mensaje-chat").disabled = true;
  document.getElementById("input-mensaje-chat").placeholder = "Debes iniciar sesión...";
  document.getElementById("btn-enviar-chat").disabled = true;
  clearInterval(intervaloChat);
  intervaloChat = null;
} */

// TRAER LOS MENSAJES DE GOOGLE SHEETS
async function cargarMensajesChat() {
  try {
    const respuesta = await fetch(`${API_URL}?accion=obtenerChat`);
    const resultado = await respuesta.json();
    
    if (resultado.exito) {
      const caja = document.getElementById("caja-mensajes");
      caja.innerHTML = "";
      
      resultado.datos.forEach(msg => {
        // msg[1] = Remitente, msg[3] = Texto Mensaje
        const esAdmin = msg[1].includes("Admin");
        const alineacion = esAdmin ? "text-left" : "text-right";
        const colorBurbuja = esAdmin ? "bg-gray-200 text-gray-800" : "bg-blue-500 text-white inline-block";
        
        const burbuja = `
          <div class="${alineacion} mb-1">
            <span class="text-[10px] block text-gray-400">${msg[1]}</span>
            <div class="p-2 rounded-lg p-1.5 ${colorBurbuja} max-w-[85%] break-words">
              ${msg[3]}
            </div>
          </div>
        `;
        caja.innerHTML += burbuja;
      });
      // Auto-scroll al último mensaje recibido
      caja.scrollTop = caja.scrollHeight;
    }
  } catch (error) {
    console.error("Error al refrescar chat:", error);
  }
}

// ENVIAR UN NUEVO MENSAJE
async function enviarMensajeChat(event) {
  event.preventDefault();
  const input = document.getElementById("input-mensaje-chat");
  const texto = input.value.trim();
  
  if (!texto || !usuarioActivo) return;

  const datosMsg = {
    accion: "enviarMensaje",
    remitente: `${usuarioActivo.nombre} (${usuarioActivo.rol})`,
    idUsuario: usuarioActivo.id,
    mensaje: texto
  };

  input.value = ""; // Limpiar input inmediatamente para dar fluidez

  try {
    const respuesta = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(datosMsg)
    });
    const resultado = await respuesta.json();
    
    if (resultado.exito) {
      cargarMensajesChat(); // Forzar recarga visual
    }
  } catch (error) {
    console.error("Error al enviar chat:", error);
  }
}
